import type { ReciboVenda } from '../../../src/shared/contracts';
import { formatarDataHora, formatarMoeda, idCurto, ROTULOS_PAGAMENTO } from '../utils/formatacao';

interface ReciboCardProps {
  recibo: ReciboVenda;
  onNovaVenda: () => void;
}

export function ReciboCard({ recibo, onNovaVenda }: ReciboCardProps) {
  return (
    <section className="card recibo" aria-labelledby="titulo-recibo" data-testid="recibo">
      <div className="recibo-cabecalho">
        <span className="selo selo-ok">Venda concluída</span>
        <h2 id="titulo-recibo">Recibo #{idCurto(recibo.id)}</h2>
        <p className="produto-meta">
          {formatarDataHora(recibo.data)} · ID {recibo.id}
        </p>
      </div>

      <table className="recibo-itens">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qtd.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {recibo.itens.map((item) => (
            <tr key={item.sku ?? item.nome}>
              <td>
                {item.nome}
                <span className="produto-meta"> · {formatarMoeda(item.precoUnitario)}</span>
              </td>
              <td className="numero">{item.quantidade}</td>
              <td className="numero">{formatarMoeda(item.precoUnitario * item.quantidade)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="resumo">
        <div>
          <dt>Subtotal</dt>
          <dd className="numero">{formatarMoeda(recibo.subtotal)}</dd>
        </div>
        {recibo.descontoCupom > 0 && (
          <div>
            <dt>Desconto do cupom ({recibo.cupomAplicado})</dt>
            <dd className="numero desconto">− {formatarMoeda(recibo.descontoCupom)}</dd>
          </div>
        )}
        {recibo.descontoExtra > 0 && (
          <div>
            <dt>Bônus compras acima de R$ 200</dt>
            <dd className="numero desconto">− {formatarMoeda(recibo.descontoExtra)}</dd>
          </div>
        )}
        <div className="resumo-total">
          <dt>Total</dt>
          <dd className="numero" data-testid="recibo-total">
            {formatarMoeda(recibo.totalFinal)}
          </dd>
        </div>
        {recibo.formaPagamento && (
          <div>
            <dt>Pagamento</dt>
            <dd data-testid="recibo-pagamento">{ROTULOS_PAGAMENTO[recibo.formaPagamento]}</dd>
          </div>
        )}
        {recibo.valorPago !== undefined && (
          <div>
            <dt>Valor pago</dt>
            <dd className="numero">{formatarMoeda(recibo.valorPago)}</dd>
          </div>
        )}
        {recibo.troco !== undefined && (
          <div>
            <dt>Troco</dt>
            <dd className="numero" data-testid="recibo-troco">
              {formatarMoeda(recibo.troco)}
            </dd>
          </div>
        )}
      </dl>

      <button type="button" className="btn btn-primario btn-finalizar" onClick={onNovaVenda}>
        Nova venda
      </button>
    </section>
  );
}
