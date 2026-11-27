import { Request, Response, Router } from 'express';
import { CheckoutRequest, SimularCaixaRequest } from '../../models/types.js';
import type { ExecutarNoContainer } from '../app.js';

export function criarRotasCaixa(executar: ExecutarNoContainer): Router {
  const router = Router();

  router.post('/caixa/simular', async (req: Request, res: Response) => {
    const pedido = (req.body ?? {}) as SimularCaixaRequest;
    res.json(await executar('leitura', ({ checkoutService }) => checkoutService.simularPedido(pedido)));
  });

  router.post('/checkout', async (req: Request, res: Response) => {
    const pedido = (req.body ?? {}) as CheckoutRequest;
    const recibo = await executar('escrita', ({ checkoutService }) => checkoutService.finalizarPedido(pedido));
    res.status(201).json(recibo);
  });

  return router;
}
