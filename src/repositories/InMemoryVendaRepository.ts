import { ReciboVenda } from '../shared/contracts.js';
import { IVendaRepository } from './IVendaRepository.js';

function clonarVenda(venda: ReciboVenda): ReciboVenda {
  return {
    ...venda,
    itens: venda.itens.map((item) => ({ ...item })),
  };
}

export class InMemoryVendaRepository implements IVendaRepository {
  private readonly vendas = new Map<string, ReciboVenda>();

  registrar(venda: ReciboVenda): ReciboVenda {
    const copia = clonarVenda(venda);
    this.vendas.set(copia.id, copia);
    return clonarVenda(copia);
  }

  atualizar(venda: ReciboVenda): ReciboVenda {
    return this.registrar(venda);
  }

  buscarPorId(id: string): ReciboVenda | null {
    const encontrada = this.vendas.get(id);
    return encontrada ? clonarVenda(encontrada) : null;
  }

  listarTodas(): ReciboVenda[] {
    return Array.from(this.vendas.values(), clonarVenda);
  }
}
