import { useEffect, useState } from 'react';
import { Navegacao, type Modulo } from './components/Navegacao';
import { api, type HealthStatus } from './services/api';

export function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [erroConexao, setErroConexao] = useState<string | null>(null);
  const [modulo, setModulo] = useState<Modulo>('pdv');

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch(() => setErroConexao('Não foi possível conectar ao servidor Mercado Horizonte'));
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="marca">
          <span className="logo" aria-hidden="true">
            MH
          </span>
          <div>
            <h1>Mercado Horizonte</h1>
            <p className="subtitle">Plataforma de Varejo, Estoque e Frente de Caixa</p>
          </div>
        </div>
        <span
          className={erroConexao ? 'status-badge status-offline' : 'status-badge'}
          data-testid="api-status"
        >
          {health
            ? `API Online (${health.produtosCadastrados} produtos)`
            : (erroConexao ?? 'Conectando...')}
        </span>
      </header>

      <Navegacao ativo={modulo} onSelecionar={setModulo} />

      <main className="content">
        {modulo === 'pdv' && <section className="card">PDV em construção</section>}
        {modulo === 'estoque' && <section className="card">Estoque em construção</section>}
        {modulo === 'vendas' && <section className="card">Vendas em construção</section>}
      </main>
    </div>
  );
}
