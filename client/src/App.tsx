import { useEffect, useState } from 'react';

interface HealthStatus {
  status: string;
  service: string;
  produtosCadastrados: number;
}

export function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json() as Promise<HealthStatus>;
      })
      .then((dados) => setHealth(dados))
      .catch(() => setErro('Não foi possível conectar ao servidor Mercado Horizonte'));
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Mercado Horizonte</h1>
          <p className="subtitle">Plataforma de Varejo, Estoque e Frente de Caixa</p>
        </div>
        <span className="status-badge" data-testid="api-status">
          {health ? `API Online (${health.produtosCadastrados} produtos)` : erro ?? 'Conectando...'}
        </span>
      </header>

      <main className="content">
        <section className="card">
          <h2>Operação da Loja</h2>
          <p>
            Ambiente web preparado para os módulos de Frente de Caixa (PDV), Gestão de Estoque e
            Histórico de Vendas.
          </p>
        </section>
      </main>
    </div>
  );
}
