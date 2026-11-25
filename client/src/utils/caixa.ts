export interface ItemCarrinhoLocal {
  sku: string;
  quantidade: number;
}

export function adicionarAoCarrinho(
  carrinho: readonly ItemCarrinhoLocal[],
  sku: string,
  quantidade = 1,
): ItemCarrinhoLocal[] {
  const existente = carrinho.find((item) => item.sku === sku);
  if (!existente) {
    return [...carrinho, { sku, quantidade }];
  }
  return carrinho.map((item) =>
    item.sku === sku ? { ...item, quantidade: item.quantidade + quantidade } : item,
  );
}

export function alterarQuantidade(
  carrinho: readonly ItemCarrinhoLocal[],
  sku: string,
  novaQuantidade: number,
): ItemCarrinhoLocal[] {
  if (novaQuantidade <= 0) {
    return carrinho.filter((item) => item.sku !== sku);
  }
  return carrinho.map((item) => (item.sku === sku ? { ...item, quantidade: novaQuantidade } : item));
}

/**
 * Converte o texto digitado pelo operador ("50", "50,00", "50.5") em número.
 * Retorna null quando o valor não é um número positivo válido.
 */
export function lerValorMonetario(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) {
    return null;
  }
  return Number(limpo);
}

/**
 * Calcula o troco em centavos inteiros para evitar erros de ponto flutuante.
 * Retorna null quando o valor recebido não cobre o total.
 */
export function calcularTroco(valorRecebido: number, totalFinal: number): number | null {
  const centavos = Math.round(valorRecebido * 100) - Math.round(totalFinal * 100);
  if (centavos < 0) {
    return null;
  }
  return centavos / 100;
}
