import { Request, Response, NextFunction } from 'express';
import { paystackService } from '../services/paystack.service';
import { paymentsService } from '../services/payments.service';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

export async function paystackWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    if (!signature) {
      res.status(400).json({ success: false, message: 'Missing signature' });
      return;
    }

    // req.rawBody is set by the raw body middleware specifically for this route
    const rawBody = (req as Request & { rawBody: string }).rawBody;
    const isValid = paystackService.verifyWebhookSignature(rawBody, signature);

    if (!isValid && env.NODE_ENV === 'production') {
      logger.warn('Invalid Paystack webhook signature');
      res.status(401).json({ success: false, message: 'Invalid signature' });
      return;
    }

    const { event, data } = req.body as { event: string; data: Record<string, unknown> };
    await paymentsService.handleWebhook(event, data);

    // Always 200 to Paystack to prevent retries for handled events
    res.status(200).json({ received: true });
  } catch (err) {
    logger.error('Webhook processing error', { error: err });
    // Still 200 to prevent Paystack retry storms
    res.status(200).json({ received: true });
  }
}
