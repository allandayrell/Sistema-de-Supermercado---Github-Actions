import type { Pool, PoolClient } from 'pg';
import { InMemoryProdutoRepository } from '../repositories/InMemoryProdutoRepository.js';
import { InMemoryVendaRepository } from '../repositories/InMemoryVendaRepository.js';
import type { Produto, ReciboVenda } from '../shared/contracts.js';
import { createDefaultContainer, criarContainer, type ExecutarNoContainer } from './app.js';

interface EstadoMercado {
  produtos: Produto[];
  vendas: ReciboVenda[];
}

async function emTransacao<T>(pool: Pool, operacao: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let descartarConexao = false;
  try {
    await client.query('BEGIN');
    const resultado = await operacao(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    try {
      await client.query('ROLLBACK');
    } catch {
      descartarConexao = true;
    }
    throw erro;
  } finally {
    client.release(descartarConexao);
  }
}

function prepararBanco(pool: Pool): Promise<void> {
  return emTransacao(pool, async (client) => {
    // Serializa a criação da tabela quando instâncias iniciam ao mesmo tempo.
    await client.query('SELECT pg_advisory_xact_lock($1)', [596302117]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS mercado_horizonte_estado (
        id integer PRIMARY KEY CHECK (id = 1),
        estado jsonb NOT NULL
      )
    `);
    const estadoInicial: EstadoMercado = {
      produtos: createDefaultContainer('').estoqueService.listarProdutos(),
      vendas: [],
    };
    await client.query(
      'INSERT INTO mercado_horizonte_estado (id, estado) VALUES (1, $1) ON CONFLICT (id) DO NOTHING',
      [estadoInicial],
    );
  });
}

async function carregarEstado(banco: Pool | PoolClient, bloquear = false): Promise<EstadoMercado> {
  const consulta = 'SELECT estado FROM mercado_horizonte_estado WHERE id = 1';
  const { rows } = await banco.query<{ estado: EstadoMercado }>(
    bloquear ? `${consulta} FOR UPDATE` : consulta,
  );
  return rows[0].estado;
}

function criarRepositorios(estado: EstadoMercado) {
  const produtos = new InMemoryProdutoRepository();
  const vendas = new InMemoryVendaRepository();
  for (const produto of estado.produtos) {
    produtos.salvar(produto);
  }
  for (const venda of estado.vendas) {
    vendas.registrar(venda);
  }
  return { produtos, vendas };
}

export function criarExecucaoPostgres(pool: Pool): ExecutarNoContainer {
  let inicializacao: Promise<void> | undefined;

  return async (tipo, operacao) => {
    inicializacao ??= prepararBanco(pool).catch((erro: unknown) => {
      inicializacao = undefined;
      throw erro;
    });
    await inicializacao;

    if (tipo === 'leitura') {
      const { produtos, vendas } = criarRepositorios(await carregarEstado(pool));
      return operacao(criarContainer(produtos, vendas));
    }

    return emTransacao(pool, async (client) => {
      const { produtos, vendas } = criarRepositorios(await carregarEstado(client, true));
      const resultado = operacao(criarContainer(produtos, vendas));
      const estado: EstadoMercado = { produtos: produtos.listarTodos(), vendas: vendas.listarTodas() };
      await client.query('UPDATE mercado_horizonte_estado SET estado = $1 WHERE id = 1', [estado]);
      return resultado;
    });
  };
}
