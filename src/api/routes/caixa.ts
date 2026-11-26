import { Request, Response, Router } from 'express';
import { CheckoutRequest, SimularCaixaRequest } from '../../models/types.js';
import { CheckoutService } from '../../services/CheckoutService.js';

export function criarRotasCaixa(checkoutService: CheckoutService): Router {
  const router = Router();

  router.post('/caixa/simular', (req: Request, res: Response) => {
    const pedido = (req.body ?? {}) as SimularCaixaRequest;
    res.json(checkoutService.simularPedido(pedido));
  });

  router.post('/checkout', (req: Request, res: Response) => {
    const pedido = (req.body ?? {}) as CheckoutRequest;
    res.status(201).json(checkoutService.finalizarPedido(pedido));
  });

  return router;
}
