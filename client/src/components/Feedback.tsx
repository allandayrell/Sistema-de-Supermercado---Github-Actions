import type { ReactNode } from 'react';

export type TipoBanner = 'erro' | 'sucesso' | 'info';

interface BannerProps {
  tipo: TipoBanner;
  children: ReactNode;
  onFechar?: () => void;
}

export function Banner({ tipo, children, onFechar }: BannerProps) {
  return (
    <div
      className={`banner banner-${tipo}`}
      role={tipo === 'erro' ? 'alert' : 'status'}
      data-testid={`banner-${tipo}`}
    >
      <span>{children}</span>
      {onFechar && (
        <button type="button" className="banner-fechar" onClick={onFechar} aria-label="Fechar aviso">
          ×
        </button>
      )}
    </div>
  );
}

interface EstadoVazioProps {
  titulo: string;
  descricao?: string;
}

export function EstadoVazio({ titulo, descricao }: EstadoVazioProps) {
  return (
    <div className="estado-vazio">
      <strong>{titulo}</strong>
      {descricao && <p>{descricao}</p>}
    </div>
  );
}

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div className="carregando" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {texto}
    </div>
  );
}
