import { useCallback, useEffect, useState } from 'react';
import type { DashboardResumo, ReciboVenda } from '../../../src/shared/contracts';
import { Banner, Carregando, EstadoVazio } from '../components/Feedback';
import { api, mensagemDeErro } from '../services/api';
import {
  formatarDataHora,
  formatarMoeda,
  idCurto,
  ROTULOS_PAGAMENTO,
} from '../utils/formatacao';
import { ordenarVendasMaisRecentes, podeEstornar, resumirItens } from '../utils/vendas';
import { DashboardCards } from './DashboardCards';

export function VendasView() {
  const [dashboard, setDashboard] = useState<DashboardResumo | null>(null);
  const [vendas, setVendas] = useState<ReciboVenda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [estornandoId, setEstornandoId] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [novoDashboard, novasVendas] = await Promise.all([
        api.obterDashboard(),
        api.listarVendas(),
      ]);
      setDashboard(novoDashboard);
      setVendas(ordenarVendasMaisRecentes(novasVendas));
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  async function estornarVenda(venda: ReciboVenda) {
    if (!podeEstornar(venda)) {
      return;
    }

    const confirmou = window.confirm(
      `Estornar a venda #${idCurto(venda.id)}? Os itens serão devolvidos ao estoque.`,
    );
    if (!confirmou) {
      return;
    }

    setEstornandoId(venda.id);
    setErro(null);
    setSucesso(null);
    try {
      const atualizada = await api.estornarVenda(venda.id);
      setVendas((atuais) =>
        ordenarVendasMaisRecentes(
          atuais.map((item) => (item.id === atualizada.id ? atualizada : item)),
        ),
      );

      const [novoDashboard, novasVendas] = await Promise.all([
        api.obterDashboard(),
        api.listarVendas(),
      ]);
      setDashboard(novoDashboard);
      setVendas(ordenarVendasMaisRecentes(novasVendas));
      setSucesso(`Venda #${idCurto(venda.id)} estornada e itens devolvidos ao estoque.`);
    } catch (falha) {
      setErro(mensagemDeErro(falha));
    } finally {
      setEstornandoId(null);
    }
  }

  if (carregando && dashboard === null) {
    return (
      <section className="card">
        <Carregando texto="Carregando vendas e indicadores..." />
      </section>
    );
  }

  return (
    <div className="vendas-painel">
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

      <div className="painel-cabecalho">
        <div>
          <h2>Visão geral</h2>
          <p className="texto-apoio">Indicadores calculados a partir das vendas válidas.</p>
        </div>
        <button
          type="button"
          className="btn btn-pequeno"
          onClick={() => void carregarDados()}
          disabled={carregando || estornandoId !== null}
        >
          {carregando ? 'Atualizando...' : 'Atualizar painel'}
        </button>
      </div>

      {dashboard && <DashboardCards resumo={dashboard} />}

      <section className="card historico" aria-labelledby="titulo-historico">
        <div className="secao-cabecalho">
          <div>
            <h2 id="titulo-historico">Histórico de vendas</h2>
            <p className="texto-apoio">{vendas.length} venda(s) registrada(s)</p>
          </div>
        </div>

        {vendas.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma venda registrada"
            descricao="As vendas finalizadas no PDV aparecerão aqui."
          />
        ) : (
          <div className="lista-vendas" data-testid="historico-vendas">
            {vendas.map((venda) => (
              <article className="venda-card" key={venda.id} data-testid={`venda-${venda.id}`}>
                <header className="venda-cabecalho">
                  <div>
                    <strong>Venda #{idCurto(venda.id)}</strong>
                    <span className="produto-meta">{formatarDataHora(venda.data)}</span>
                  </div>
                  <span
                    className={
                      venda.status === 'CONCLUIDA' ? 'selo selo-ok' : 'selo selo-erro'
                    }
                  >
                    {venda.status === 'CONCLUIDA' ? 'Concluída' : 'Estornada'}
                  </span>
                </header>

                <p className="venda-itens">
                  <strong>Itens:</strong> {resumirItens(venda)}
                </p>

                <dl className="venda-dados">
                  <div>
                    <dt>Pagamento</dt>
                    <dd>
                      {venda.formaPagamento
                        ? ROTULOS_PAGAMENTO[venda.formaPagamento]
                        : 'Não informado'}
                    </dd>
                  </div>
                  <div>
                    <dt>Total pago</dt>
                    <dd className="numero">{formatarMoeda(venda.totalFinal)}</dd>
                  </div>
                  {venda.formaPagamento === 'DINHEIRO' && venda.valorPago !== undefined && (
                    <div>
                      <dt>Valor recebido</dt>
                      <dd className="numero">{formatarMoeda(venda.valorPago)}</dd>
                    </div>
                  )}
                  {venda.estornadaEm && (
                    <div>
                      <dt>Estornada em</dt>
                      <dd>{formatarDataHora(venda.estornadaEm)}</dd>
                    </div>
                  )}
                </dl>

                <button
                  type="button"
                  className="btn btn-perigo btn-pequeno venda-estornar"
                  disabled={!podeEstornar(venda) || estornandoId !== null}
                  onClick={() => void estornarVenda(venda)}
                  aria-label={`Estornar venda ${idCurto(venda.id)}`}
                >
                  {estornandoId === venda.id
                    ? 'Estornando...'
                    : venda.status === 'ESTORNADA'
                      ? 'Venda já estornada'
                      : 'Estornar venda'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
