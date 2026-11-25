import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, createDefaultContainer } from '../../src/api/app.js';
import { PRODUTOS_SEED_MERCADO_HORIZONTE } from '../../src/infrastructure/seed.js';

describe('API Express Base (Health & Static)', () => {
  const diretoriosTemporarios: string[] = [];

  afterEach(() => {
    while (diretoriosTemporarios.length > 0) {
      rmSync(diretoriosTemporarios.pop()!, { recursive: true, force: true });
    }
  });

  it('deve responder 200 OK em GET /api/health com produtos semeados', async () => {
    const app = createApp();
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('Mercado Horizonte');
    expect(response.body.produtosCadastrados).toBe(
      PRODUTOS_SEED_MERCADO_HORIZONTE.length,
    );
  });

  it('deve responder 404 para rota desconhecida em /api', async () => {
    const app = createApp();
    const response = await request(app).get('/api/nao-existe');

    expect(response.status).toBe(404);
    expect(response.body.codigo).toBe('ROTA_NAO_ENCONTRADA');
  });

  it('deve servir fallback SPA quando o bundle client estiver presente e suportar DATA_DIR', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mh-app-'));
    diretoriosTemporarios.push(dir);
    writeFileSync(join(dir, 'index.html'), '<html><body>Mercado Horizonte</body></html>');

    const container = createDefaultContainer(dir);
    const app = createApp(container, { clientDistPath: dir });

    const spaResponse = await request(app).get('/estoque');
    expect(spaResponse.status).toBe(200);
    expect(spaResponse.text).toContain('Mercado Horizonte');

    const jsonMalformado = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{invalido');
    expect(jsonMalformado.status).toBe(400);
    expect(jsonMalformado.body.codigo).toBe('JSON_INVALIDO');
  });
});
