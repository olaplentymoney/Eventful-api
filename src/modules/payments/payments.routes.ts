import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { paymentsController } from './controllers/payments.controller';
import { paystackWebhookHandler } from './webhooks/paystack.webhook';
import { authenticate } from '../../shared/guards/jwt-auth.guard';
import { requireAny, requireCreator, requireEventee } from '../../shared/guards/roles.guard';
import { paymentRateLimiter } from '../../shared/middleware/rate-limiter.middleware';

const router = Router();

// Webhook — MUST come before json body parser, needs raw body
router.post(
  '/webhook/paystack',
  express.raw({ type: 'application/json' }),
  (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { rawBody: string }).rawBody = req.body.toString('utf8');
    next();
  },
  express.json(),
  paystackWebhookHandler,
);

// Authenticated payment routes
router.post('/initiate', authenticate, requireEventee, paymentRateLimiter, paymentsController.initiate.bind(paymentsController));
router.get('/verify/:reference', authenticate, requireAny, paymentsController.verify.bind(paymentsController));
router.get('/mine', authenticate, requireAny, paymentsController.myPayments.bind(paymentsController));
router.get('/:reference', authenticate, requireAny, paymentsController.getByReference.bind(paymentsController));

// Creator: view payments for their events
router.get('/event/:eventId', authenticate, requireCreator, paymentsController.eventPayments.bind(paymentsController));

export default router;
