import { Request, Response, Router } from 'express';
import type { ExecutarNoContainer } from '../app.js';

export function criarRotasVendas(executar: ExecutarNoContainer): Router {
  const router = Router();

  router.get('/vendas', async (_req: Request, res: Response) => {
    res.json(await executar('leitura', ({ checkoutService }) => checkoutService.listarVendas()));
  });

  router.post('/vendas/:id/estorno', async (req: Request<{ id: string }>, res: Response) => {
    res.json(await executar('escrita', ({ checkoutService }) => checkoutService.estornarVenda(req.params.id)));
  });

  router.get('/dashboard', async (_req: Request, res: Response) => {
    res.json(await executar('leitura', ({ checkoutService }) => checkoutService.obterDashboardResumo()));
  });

  return router;
}
