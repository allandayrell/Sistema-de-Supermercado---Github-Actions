import { ReciboVenda } from '../shared/contracts.js';

export interface IVendaRepository {
  registrar(venda: ReciboVenda): ReciboVenda;
  atualizar(venda: ReciboVenda): ReciboVenda;
  buscarPorId(id: string): ReciboVenda | null;
  listarTodas(): ReciboVenda[];
}
