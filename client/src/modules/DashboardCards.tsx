import type { DashboardResumo } from '../../../src/shared/contracts';
import { formatarMoeda } from '../utils/formatacao';

interface DashboardCardsProps {
  resumo: DashboardResumo;
}

export function DashboardCards({ resumo }: DashboardCardsProps) {
  return (
    <section className="dashboard-cards" aria-label="Indicadores da loja">
      <article className="card indicador">
        <span className="indicador-rotulo">Faturamento líquido</span>
        <strong className="indicador-valor numero" data-testid="faturamento-liquido">
          {formatarMoeda(resumo.faturamentoLiquido)}
        </strong>
        <span className="indicador-detalhe">Desconsidera vendas estornadas</span>
      </article>

      <article className="card indicador">
        <span className="indicador-rotulo">Vendas concluídas</span>
        <strong className="indicador-valor numero" data-testid="vendas-concluidas">
          {resumo.totalVendasConcluidas}
        </strong>
        <span className="indicador-detalhe">
          {resumo.totalVendasEstornadas} venda(s) estornada(s)
        </span>
      </article>

      <article className="card indicador">
        <span className="indicador-rotulo">Ticket médio</span>
        <strong className="indicador-valor numero" data-testid="ticket-medio">
          {formatarMoeda(resumo.ticketMedio)}
        </strong>
        <span className="indicador-detalhe">Média das vendas válidas</span>
      </article>

      <article
        className={
          resumo.produtosEstoqueBaixo > 0
            ? 'card indicador indicador-alerta'
            : 'card indicador'
        }
      >
        <span className="indicador-rotulo">Alertas de estoque</span>
        <strong className="indicador-valor numero" data-testid="alertas-estoque">
          {resumo.produtosEstoqueBaixo}
        </strong>
        <span className="indicador-detalhe">
          de {resumo.totalProdutosAtivos} produto(s) ativo(s)
        </span>
      </article>
    </section>
  );
}
