import type { ReciboVenda } from '../../../src/shared/contracts';

export function ordenarVendasMaisRecentes(vendas: readonly ReciboVenda[]): ReciboVenda[] {
  return [...vendas].sort((a, b) => {
    const dataA = new Date(a.data).getTime();
    const dataB = new Date(b.data).getTime();
    return (Number.isNaN(dataB) ? 0 : dataB) - (Number.isNaN(dataA) ? 0 : dataA);
  });
}

export function resumirItens(venda: Pick<ReciboVenda, 'itens'>): string {
  return venda.itens
    .map((item) => `${item.quantidade}× ${item.nome}`)
    .join(', ');
}

export function podeEstornar(venda: Pick<ReciboVenda, 'status'>): boolean {
  return venda.status === 'CONCLUIDA';
}
