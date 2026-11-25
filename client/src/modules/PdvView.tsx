import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FORMAS_PAGAMENTO,
  type FormaPagamento,
  type Produto,
  type ReciboVenda,
  type ResumoCaixa,
} from '../../../src/shared/contracts';
import { Banner, Carregando, EstadoVazio } from '../components/Feedback';
import { api, ApiError, mensagemDeErro } from '../services/api';
import {
  adicionarAoCarrinho,
  alterarQuantidade,
  calcularTroco,
  lerValorMonetario,
  type ItemCarrinhoLocal,
} from '../utils/caixa';
import { filtrarCatalogo } from '../utils/catalogo';
import { formatarMoeda, ROTULOS_PAGAMENTO } from '../utils/formatacao';
import { ReciboCard } from './ReciboCard';

export function PdvView() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinhoLocal[]>([]);
  const [cupomDigitado, setCupomDigitado] = useState('');
  const [cupom, setCupom] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoCaixa | null>(null);
  const [simulando, setSimulando] = useState(false);
  const [erroCaixa, setErroCaixa] = useState<string | null>(null);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [valorRecebidoTexto, setValorRecebidoTexto] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const [recibo, setRecibo] = useState<ReciboVenda | null>(null);

  const carregarProdutos = useCallback(async () => {
    try {
      setProdutos(await api.listarProdutos());
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarProdutos();
  }, [carregarProdutos]);

  useEffect(() => {
    if (carrinho.length === 0) {
      setResumo(null);
      setSimulando(false);
      return;
    }

    let cancelado = false;
    setResumo(null);
    setSimulando(true);
    api
      .simularCaixa({ itens: carrinho, ...(cupom ? { cupom } : {}) })
      .then((novoResumo) => {
        if (!cancelado) {
          setResumo(novoResumo);
        }
      })
      .catch((e: unknown) => {
        if (cancelado) {
          return;
        }
        setResumo(null);
        if (e instanceof ApiError && e.codigo === 'CUPOM_INVALIDO') {
          // Cupom deixou de ser válido: removemos e recalculamos sem ele.
          setCupom(null);
        }
        setErroCaixa(mensagemDeErro(e));
      })
      .finally(() => {
        if (!cancelado) {
          setSimulando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [carrinho, cupom]);

  function aplicarCupom() {
    const codigo = cupomDigitado.trim().toUpperCase();
    if (!codigo) {
      return;
    }
    setErroCaixa(null);
    setCupom(codigo);
    setCupomDigitado('');
  }

  function removerCupom() {
    setCupom(null);
  }

  async function finalizarVenda() {
    setErroCaixa(null);
    setFinalizando(true);
    try {
      const valorRecebido = lerValorMonetario(valorRecebidoTexto);
      const novoRecibo = await api.finalizarCompra({
        itens: carrinho,
        ...(cupom ? { cupom } : {}),
        pagamento:
          formaPagamento === 'DINHEIRO'
            ? { forma: 'DINHEIRO', ...(valorRecebido !== null ? { valorRecebido } : {}) }
            : { forma: formaPagamento },
      });
      setRecibo(novoRecibo);
      void carregarProdutos();
    } catch (e) {
      setErroCaixa(mensagemDeErro(e));
    } finally {
      setFinalizando(false);
    }
  }

  function iniciarNovaVenda() {
    setRecibo(null);
    setCarrinho([]);
    setCupom(null);
    setCupomDigitado('');
    setFormaPagamento('PIX');
    setValorRecebidoTexto('');
    setErroCaixa(null);
  }

  const valorRecebido = lerValorMonetario(valorRecebidoTexto);
  const trocoPrevisto =
    resumo && valorRecebido !== null ? calcularTroco(valorRecebido, resumo.totalFinal) : null;
  const dinheiroIncompleto =
    formaPagamento === 'DINHEIRO' &&
    (valorRecebido === null || (resumo !== null && trocoPrevisto === null));

  const produtosPorSku = useMemo(
    () => new Map(produtos.map((produto) => [produto.sku, produto])),
    [produtos],
  );
  const catalogoFiltrado = useMemo(() => filtrarCatalogo(produtos, { busca }), [produtos, busca]);

  return (
    <div className="pdv">
      <section className="card pdv-catalogo" aria-labelledby="titulo-catalogo">
        <div className="secao-cabecalho">
          <h2 id="titulo-catalogo">Catálogo</h2>
          <input
            type="search"
            className="input"
            placeholder="Buscar por nome ou SKU"
            aria-label="Buscar produto"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {erro && (
          <Banner tipo="erro" onFechar={() => setErro(null)}>
            {erro}
          </Banner>
        )}

        {carregando ? (
          <Carregando texto="Carregando catálogo..." />
        ) : catalogoFiltrado.length === 0 ? (
          <EstadoVazio titulo="Nenhum produto encontrado" descricao="Ajuste a busca ou cadastre produtos no Estoque." />
        ) : (
          <ul className="lista-produtos">
            {catalogoFiltrado.map((produto) => (
              <li key={produto.sku} className="produto-item">
                <div className="produto-info">
                  <strong>{produto.nome}</strong>
                  <span className="produto-meta">
                    {produto.sku} · {produto.categoria}
                  </span>
                </div>
                <div className="produto-valores">
                  <span className="numero">{formatarMoeda(produto.preco)}</span>
                  <span className={produto.quantidade === 0 ? 'selo selo-erro' : 'produto-meta'}>
                    {produto.quantidade === 0 ? 'Sem estoque' : `${produto.quantidade} em estoque`}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-primario btn-pequeno"
                  aria-label={`Adicionar ${produto.nome}`}
                  disabled={produto.quantidade === 0}
                  onClick={() => setCarrinho((atual) => adicionarAoCarrinho(atual, produto.sku))}
                >
                  Adicionar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recibo ? (
        <ReciboCard recibo={recibo} onNovaVenda={iniciarNovaVenda} />
      ) : (
        <section className="card pdv-carrinho" aria-labelledby="titulo-carrinho">
          <h2 id="titulo-carrinho">Carrinho</h2>

          {erroCaixa && (
            <Banner tipo="erro" onFechar={() => setErroCaixa(null)}>
              {erroCaixa}
            </Banner>
          )}

          {carrinho.length === 0 ? (
            <EstadoVazio titulo="Carrinho vazio" descricao="Adicione produtos do catálogo para iniciar a venda." />
          ) : (
            <ul className="lista-carrinho" data-testid="carrinho">
              {carrinho.map((item) => {
                const produto = produtosPorSku.get(item.sku);
                const nome = produto?.nome ?? item.sku;
                const acimaDoEstoque = produto !== undefined && item.quantidade > produto.quantidade;
                return (
                  <li key={item.sku} className="carrinho-item">
                    <div className="produto-info">
                      <strong>{nome}</strong>
                      <span className="produto-meta numero">
                        {produto ? formatarMoeda(produto.preco) : '—'} / un.
                      </span>
                      {acimaDoEstoque && (
                        <span className="selo selo-alerta">
                          Acima do estoque ({produto.quantidade} disp.)
                        </span>
                      )}
                    </div>
                    <div className="quantidade-controle">
                      <button
                        type="button"
                        className="btn btn-pequeno"
                        aria-label={`Diminuir ${nome}`}
                        disabled={item.quantidade <= 1}
                        onClick={() =>
                          setCarrinho((atual) => alterarQuantidade(atual, item.sku, item.quantidade - 1))
                        }
                      >
                        −
                      </button>
                      <span className="numero" aria-label={`Quantidade de ${nome}`}>
                        {item.quantidade}
                      </span>
                      <button
                        type="button"
                        className="btn btn-pequeno"
                        aria-label={`Aumentar ${nome}`}
                        onClick={() =>
                          setCarrinho((atual) => alterarQuantidade(atual, item.sku, item.quantidade + 1))
                        }
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-perigo btn-pequeno"
                      aria-label={`Remover ${nome}`}
                      onClick={() => setCarrinho((atual) => alterarQuantidade(atual, item.sku, 0))}
                    >
                      Remover
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="cupom">
            {cupom ? (
              <div className="cupom-aplicado">
                <span>
                  Cupom <strong data-testid="cupom-aplicado">{cupom}</strong> aplicado
                </span>
                <button type="button" className="btn btn-pequeno" onClick={removerCupom}>
                  Remover cupom
                </button>
              </div>
            ) : (
              <form
                className="cupom-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  aplicarCupom();
                }}
              >
                <input
                  className="input"
                  placeholder="Cupom (ex.: DESC10)"
                  aria-label="Código do cupom"
                  value={cupomDigitado}
                  onChange={(e) => setCupomDigitado(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn"
                  disabled={carrinho.length === 0 || !cupomDigitado.trim()}
                >
                  Aplicar
                </button>
              </form>
            )}
          </div>

          {resumo && (
            <dl className={simulando ? 'resumo resumo-atualizando' : 'resumo'} data-testid="resumo-caixa">
              <div>
                <dt>Subtotal</dt>
                <dd className="numero">{formatarMoeda(resumo.subtotal)}</dd>
              </div>
              {resumo.descontoCupom > 0 && (
                <div>
                  <dt>Desconto do cupom ({resumo.cupomAplicado})</dt>
                  <dd className="numero desconto">− {formatarMoeda(resumo.descontoCupom)}</dd>
                </div>
              )}
              {resumo.descontoExtra > 0 && (
                <div>
                  <dt>Bônus compras acima de R$ 200 (5%)</dt>
                  <dd className="numero desconto">− {formatarMoeda(resumo.descontoExtra)}</dd>
                </div>
              )}
              <div className="resumo-total">
                <dt>Total</dt>
                <dd className="numero" data-testid="total-final">
                  {formatarMoeda(resumo.totalFinal)}
                </dd>
              </div>
            </dl>
          )}

          {resumo && (
            <fieldset className="pagamento">
              <legend>Forma de pagamento</legend>
              <div className="pagamento-opcoes">
                {FORMAS_PAGAMENTO.map((forma) => (
                  <label
                    key={forma}
                    className={forma === formaPagamento ? 'opcao opcao-ativa' : 'opcao'}
                  >
                    <input
                      type="radio"
                      name="forma-pagamento"
                      value={forma}
                      checked={forma === formaPagamento}
                      onChange={() => setFormaPagamento(forma)}
                    />
                    {ROTULOS_PAGAMENTO[forma]}
                  </label>
                ))}
              </div>

              {formaPagamento === 'DINHEIRO' && (
                <div className="dinheiro">
                  <label className="campo">
                    Valor recebido (R$)
                    <input
                      inputMode="decimal"
                      placeholder="0,00"
                      value={valorRecebidoTexto}
                      onChange={(e) => setValorRecebidoTexto(e.target.value)}
                    />
                  </label>
                  <p className="troco" data-testid="troco-previsto">
                    {valorRecebido === null
                      ? 'Informe o valor recebido para calcular o troco'
                      : trocoPrevisto === null
                        ? `Faltam ${formatarMoeda(resumo.totalFinal - valorRecebido)}`
                        : `Troco: ${formatarMoeda(trocoPrevisto)}`}
                  </p>
                </div>
              )}
            </fieldset>
          )}

          <button
            type="button"
            className="btn btn-primario btn-finalizar"
            disabled={carrinho.length === 0 || !resumo || simulando || finalizando || dinheiroIncompleto}
            onClick={() => void finalizarVenda()}
          >
            {finalizando ? 'Finalizando...' : 'Finalizar venda'}
          </button>
        </section>
      )}
    </div>
  );
}
