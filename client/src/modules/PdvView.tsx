import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Produto } from '../../../src/shared/contracts';
import { Banner, Carregando, EstadoVazio } from '../components/Feedback';
import { api, mensagemDeErro } from '../services/api';
import {
  adicionarAoCarrinho,
  alterarQuantidade,
  type ItemCarrinhoLocal,
} from '../utils/caixa';
import { filtrarCatalogo } from '../utils/catalogo';
import { formatarMoeda } from '../utils/formatacao';

export function PdvView() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinhoLocal[]>([]);

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

      <section className="card pdv-carrinho" aria-labelledby="titulo-carrinho">
        <h2 id="titulo-carrinho">Carrinho</h2>

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
      </section>
    </div>
  );
}
