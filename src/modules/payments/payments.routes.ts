import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { paymentsController } from './controllers/payments.controller';
import { paystackWebhookHandler } from './webhooks/paystack.webhook';
import { authenticate } from '../../shared/guards/jwt-auth.guard';
import { requireAny, requireCreator, requireEventee } from '../../shared/guards/roles.guard';
import { paymentRateLimiter } from '../../shared/middleware/rate-limiter.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Paystack payment processing
 */

/**
 * @swagger
 * /payments/webhook/paystack:
 *   post:
 *     tags: [Payments]
 *     summary: Paystack webhook endpoint (do not call manually)
 *     security: []
 *     responses:
 *       200:
 *         description: Webhook received
 */
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

/**
 * @swagger
 * /payments/initiate:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate a Paystack payment for an event ticket
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId]
 *             properties:
 *               eventId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Payment initiated with Paystack authorization URL
 *       400:
 *         description: Event not available for purchase
 *       404:
 *         description: Event not found
 */
router.post('/initiate', authenticate, requireEventee, paymentRateLimiter, paymentsController.initiate.bind(paymentsController));

/**
 * @swagger
 * /payments/verify/{reference}:
 *   get:
 *     tags: [Payments]
 *     summary: Verify a payment by reference
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema: { type: string }
 *         example: EVT-6C44B76C76AB4E84
 *     responses:
 *       200:
 *         description: Payment status
 *       404:
 *         description: Payment not found
 */
router.get('/verify/:reference', authenticate, requireAny, paymentsController.verify.bind(paymentsController));

/**
 * @swagger
 * /payments/mine:
 *   get:
 *     tags: [Payments]
 *     summary: List my payment history
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated payment history
 */
router.get('/mine', authenticate, requireAny, paymentsController.myPayments.bind(paymentsController));

/**
 * @swagger
 * /payments/event/{eventId}:
 *   get:
 *     tags: [Payments]
 *     summary: List all successful payments for an event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated list of payments
 *       403:
 *         description: Forbidden - Creator only
 */
router.get('/event/:eventId', authenticate, requireCreator, paymentsController.eventPayments.bind(paymentsController));

/**
 * @swagger
 * /payments/{reference}:
 *   get:
 *     tags: [Payments]
 *     summary: Get a payment by reference
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Payment not found
 */
router.get('/:reference', authenticate, requireAny, paymentsController.getByReference.bind(paymentsController));

export default router;
