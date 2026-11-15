import { CaixaService } from './services/CaixaService.js';
import { CheckoutService } from './services/CheckoutService.js';
import { EstoqueService } from './services/EstoqueService.js';

function formatarMoeda(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

export function executarDemonstracao(): void {
  const estoque = new EstoqueService();
  const caixa = new CaixaService();
  const checkout = new CheckoutService(estoque, caixa);

  console.log('=== Sistema de Supermercado (Demo CLI) ===\n');

  estoque.cadastrarProduto('Arroz', 25.0, 10);
  estoque.cadastrarProduto('Feijão', 9.5, 8);
  estoque.cadastrarProduto('Café Gourmet', 60.0, 5);

  console.log('1) Estoque inicial:');
  for (const produto of estoque.listarProdutos()) {
    console.log(
      `   - ${produto.nome}: ${formatarMoeda(produto.preco)} (${produto.quantidade} unid.)`,
    );
  }

  console.log('\n2) Compra com cupom DESC10 e bônus acima de R$ 200:');
  checkout.adicionarProdutoAoCarrinho('Arroz', 3);
  checkout.adicionarProdutoAoCarrinho('Café Gourmet', 3);
  caixa.aplicarCupom('DESC10');

  const recibo = checkout.finalizarCompra();
  console.log(`   Recibo: ${recibo.id}`);
  console.log(`   Subtotal: ${formatarMoeda(recibo.subtotal)}`);
  console.log(
    `   Desconto cupom (${recibo.cupomAplicado}): -${formatarMoeda(recibo.descontoCupom)}`,
  );
  console.log(`   Desconto extra (> R$ 200): -${formatarMoeda(recibo.descontoExtra)}`);
  console.log(`   Total pago: ${formatarMoeda(recibo.totalFinal)}`);
  console.log(
    `   Estoque atualizado de Arroz: ${estoque.consultarProduto('Arroz').quantidade} unid.`,
  );

  console.log('\n3) Tentativa de compra acima do estoque (Rollback):');
  try {
    checkout.adicionarProdutoAoCarrinho('Arroz', 15);
    checkout.finalizarCompra();
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.log(`   Venda bloqueada: ${mensagem}`);
    console.log(
      `   Estoque de Arroz preservado: ${estoque.consultarProduto('Arroz').quantidade} unid.`,
    );
  }
}

executarDemonstracao();
