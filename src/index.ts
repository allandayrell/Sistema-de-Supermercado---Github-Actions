export {
  CupomInvalidoError,
  EstoqueInsuficienteError,
  PagamentoInsuficienteError,
  ProdutoNaoEncontradoError,
  ValidacaoError,
  VendaJaEstornadaError,
  VendaNaoEncontradaError,
} from './models/types.js';
export * from './shared/contracts.js';
export { popularCatalogoInicial, PRODUTOS_SEED_MERCADO_HORIZONTE } from './infrastructure/seed.js';
export type { IProdutoRepository } from './repositories/IProdutoRepository.js';
export type { IVendaRepository } from './repositories/IVendaRepository.js';
export { InMemoryProdutoRepository } from './repositories/InMemoryProdutoRepository.js';
export { InMemoryVendaRepository } from './repositories/InMemoryVendaRepository.js';
export { JsonProdutoRepository, JsonVendaRepository } from './repositories/JsonFileStorage.js';
export { CaixaService, type PagamentoCalculado } from './services/CaixaService.js';
export { CheckoutService } from './services/CheckoutService.js';
export { EstoqueService } from './services/EstoqueService.js';
