import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CATEGORIAS_PRODUTO,
  type CadastroProdutoInput,
  type CategoriaProduto,
  type Produto,
} from '../../../src/shared/contracts';
import { Banner, Carregando, EstadoVazio } from '../components/Feedback';
import { api, mensagemDeErro } from '../services/api';
import { ehEstoqueBaixo, filtrarCatalogo } from '../utils/catalogo';
import { formatarMoeda } from '../utils/formatacao';
import { ordenarProdutos, substituirProduto } from '../utils/produtos';
import { ProdutoForm } from './ProdutoForm';

type Operacao = 'cadastro' | `repor:${string}` | `preco:${string}` | `remover:${string}`;

function lerQuantidadePositiva(texto: string): number | null {
  const quantidade = Number(texto);
  return Number.isInteger(quantidade) && quantidade > 0 ? quantidade : null;
}

function lerPreco(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) {
    return null;
  }

  const preco = Number(normalizado);
  return Number.isFinite(preco) ? preco : null;
}

export function EstoqueView() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<CategoriaProduto | ''>('');
  const [apenasEstoqueBaixo, setApenasEstoqueBaixo] = useState(false);
  const [operacao, setOperacao] = useState<Operacao | null>(null);

  const carregarProdutos = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setProdutos(ordenarProdutos(await api.listarProdutos()));
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarProdutos();
  }, [carregarProdutos]);

  const produtosFiltrados = useMemo(
    () =>
      ordenarProdutos(
        filtrarCatalogo(produtos, {
          busca,
          categoria,
          apenasEstoqueBaixo,
        }),
      ),
    [apenasEstoqueBaixo, busca, categoria, produtos],
  );

  function prepararOperacao(novaOperacao: Operacao) {
    setOperacao(novaOperacao);
    setErro(null);
    setSucesso(null);
  }

  async function cadastrarProduto(dados: CadastroProdutoInput): Promise<boolean> {
    prepararOperacao('cadastro');
    try {
      const produto = await api.cadastrarProduto(dados);
      setProdutos((atuais) => ordenarProdutos(substituirProduto(atuais, produto)));
      setSucesso(`Produto “${produto.nome}” cadastrado com sucesso.`);
      return true;
    } catch (falha) {
      setErro(mensagemDeErro(falha));
      return false;
    } finally {
      setOperacao(null);
    }
  }

  async function reporEstoque(produto: Produto) {
    const digitado = window.prompt(
      `Quantas unidades de “${produto.nome}” deseja adicionar?`,
      '1',
    );
    if (digitado === null) {
      return;
    }

    const quantidade = lerQuantidadePositiva(digitado);
    if (quantidade === null) {
      setSucesso(null);
      setErro('A quantidade de reposição deve ser um inteiro maior que zero.');
      return;
    }

    prepararOperacao(`repor:${produto.sku}`);
    try {
      const atualizado = await api.reporEstoque(produto.sku, quantidade);
      setProdutos((atuais) => ordenarProdutos(substituirProduto(atuais, atualizado)));
      setSucesso(`${quantidade} unidade(s) adicionada(s) ao estoque de “${produto.nome}”.`);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setOperacao(null);
    }
  }

  async function atualizarPreco(produto: Produto) {
    const digitado = window.prompt(
      `Informe o novo preço de “${produto.nome}”:`,
      produto.preco.toFixed(2).replace('.', ','),
    );
    if (digitado === null) {
      return;
    }

    const preco = lerPreco(digitado);
    if (preco === null) {
      setSucesso(null);
      setErro('Informe um preço válido, com no máximo duas casas decimais.');
      return;
    }

    prepararOperacao(`preco:${produto.sku}`);
    try {
      const atualizado = await api.atualizarPreco(produto.sku, preco);
      setProdutos((atuais) => ordenarProdutos(substituirProduto(atuais, atualizado)));
      setSucesso(`Preço de “${produto.nome}” atualizado para ${formatarMoeda(preco)}.`);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setOperacao(null);
    }
  }

  async function removerProduto(produto: Produto) {
    const confirmou = window.confirm(
      `Remover “${produto.nome}” (${produto.sku}) do catálogo? Esta ação não pode ser desfeita.`,
    );
    if (!confirmou) {
      return;
    }

    prepararOperacao(`remover:${produto.sku}`);
    try {
      await api.removerProduto(produto.sku);
      setProdutos((atuais) => atuais.filter((item) => item.sku !== produto.sku));
      setSucesso(`Produto “${produto.nome}” removido do catálogo.`);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setOperacao(null);
    }
  }

  const filtrosAtivos = Boolean(busca.trim() || categoria || apenasEstoqueBaixo);

  return (
    <div className="estoque">
      <ProdutoForm salvando={operacao === 'cadastro'} onCadastrar={cadastrarProduto} />

      <section className="card estoque-listagem" aria-labelledby="titulo-estoque">
        <div className="secao-cabecalho">
          <div>
            <h2 id="titulo-estoque">Produtos em estoque</h2>
            <p className="texto-apoio">
              {produtos.length} produto(s) cadastrado(s) ·{' '}
              {produtos.filter(ehEstoqueBaixo).length} alerta(s)
            </p>
          </div>
          <button
            type="button"
            className="btn btn-pequeno"
            onClick={() => void carregarProdutos()}
            disabled={carregando || operacao !== null}
          >
            Atualizar dados
          </button>
        </div>

        {erro && (
          <Banner tipo="erro" onFechar={() => setErro(null)}>
            {erro}
          </Banner>
        )}
        {sucesso && (
          <Banner tipo="sucesso" onFechar={() => setSucesso(null)}>
            {sucesso}
          </Banner>
        )}

        <div className="filtros-estoque" aria-label="Filtros de produtos">
          <label className="campo">
            Buscar
            <input
              type="search"
              placeholder="Nome ou SKU"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
          </label>

          <label className="campo">
            Categoria
            <select
              value={categoria}
              onChange={(evento) =>
                setCategoria(evento.target.value as CategoriaProduto | '')
              }
            >
              <option value="">Todas as categorias</option>
              {CATEGORIAS_PRODUTO.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="filtro-checkbox">
            <input
              type="checkbox"
              checked={apenasEstoqueBaixo}
              onChange={(evento) => setApenasEstoqueBaixo(evento.target.checked)}
            />
            Apenas estoque baixo
          </label>
        </div>

        {carregando ? (
          <Carregando texto="Carregando estoque..." />
        ) : produtosFiltrados.length === 0 ? (
          <EstadoVazio
            titulo={filtrosAtivos ? 'Nenhum produto corresponde aos filtros' : 'Estoque vazio'}
            descricao={
              filtrosAtivos
                ? 'Ajuste a busca ou remova algum filtro.'
                : 'Cadastre o primeiro produto usando o formulário acima.'
            }
          />
        ) : (
          <div className="tabela-responsiva">
            <table className="tabela-produtos">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Preço unitário</th>
                  <th>Saldo</th>
                  <th>Estoque mínimo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map((produto) => {
                  const baixo = ehEstoqueBaixo(produto);
                  const ocupada = operacao?.endsWith(`:${produto.sku}`) ?? false;
                  return (
                    <tr key={produto.sku} className={baixo ? 'linha-alerta' : undefined}>
                      <td className="numero">{produto.sku}</td>
                      <td>
                        <strong>{produto.nome}</strong>
                      </td>
                      <td>{produto.categoria}</td>
                      <td className="numero">{formatarMoeda(produto.preco)}</td>
                      <td className="numero">{produto.quantidade}</td>
                      <td className="numero">{produto.estoqueMinimo}</td>
                      <td>
                        {baixo ? (
                          <span className="selo selo-alerta">Estoque baixo</span>
                        ) : (
                          <span className="selo selo-ok">Regular</span>
                        )}
                      </td>
                      <td>
                        <div className="acoes-tabela">
                          <button
                            type="button"
                            className="btn btn-pequeno"
                            disabled={ocupada}
                            aria-label={`Repor estoque de ${produto.nome}`}
                            onClick={() => void reporEstoque(produto)}
                          >
                            Repor
                          </button>
                          <button
                            type="button"
                            className="btn btn-pequeno"
                            disabled={ocupada}
                            aria-label={`Atualizar preço de ${produto.nome}`}
                            onClick={() => void atualizarPreco(produto)}
                          >
                            Preço
                          </button>
                          <button
                            type="button"
                            className="btn btn-perigo btn-pequeno"
                            disabled={ocupada}
                            aria-label={`Remover ${produto.nome}`}
                            onClick={() => void removerProduto(produto)}
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
