import { Request, Response, Router } from 'express';
import { CheckoutService } from '../../services/CheckoutService.js';

export function criarRotasVendas(checkoutService: CheckoutService): Router {
  const router = Router();

  router.get('/vendas', (_req: Request, res: Response) => {
    res.json(checkoutService.listarVendas());
  });

  router.post('/vendas/:id/estorno', (req: Request<{ id: string }>, res: Response) => {
    res.json(checkoutService.estornarVenda(req.params.id));
  });

  router.get('/dashboard', (_req: Request, res: Response) => {
    res.json(checkoutService.obterDashboardResumo());
  });

  return router;
}
