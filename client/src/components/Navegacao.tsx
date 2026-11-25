export type Modulo = 'pdv' | 'estoque' | 'vendas';

export const MODULOS: ReadonlyArray<{ id: Modulo; rotulo: string }> = [
  { id: 'pdv', rotulo: 'PDV / Caixa' },
  { id: 'estoque', rotulo: 'Estoque' },
  { id: 'vendas', rotulo: 'Vendas & Painel' },
];

interface NavegacaoProps {
  ativo: Modulo;
  onSelecionar: (modulo: Modulo) => void;
}

export function Navegacao({ ativo, onSelecionar }: NavegacaoProps) {
  return (
    <nav className="navegacao" aria-label="Módulos da loja">
      <ul role="tablist">
        {MODULOS.map((modulo) => (
          <li key={modulo.id}>
            <button
              type="button"
              role="tab"
              aria-selected={modulo.id === ativo}
              className={modulo.id === ativo ? 'aba aba-ativa' : 'aba'}
              onClick={() => onSelecionar(modulo.id)}
            >
              {modulo.rotulo}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
