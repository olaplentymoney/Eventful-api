import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { InternalServerErrorException } from '../../../shared/filters/http-exception';

const PAYSTACK_BASE = 'https://api.paystack.co';

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: 'success' | 'failed' | 'abandoned' | 'pending';
    reference: string;
    amount: number; // in kobo
    currency: string;
    channel: string;
    paid_at: string | null;
    customer: { email: string };
    metadata: Record<string, unknown>;
  };
}

export class PaystackService {
  private headers: Record<string, string>;

  constructor() {
    this.headers = {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async initializeTransaction(params: {
    email: string;
    amount: number; // naira — we convert to kobo internally
    reference: string;
    metadata?: Record<string, unknown>;
    callbackUrl?: string;
  }): Promise<PaystackInitResponse['data']> {
    const body = {
      email: params.email,
      amount: Math.round(params.amount * 100), // kobo
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    };

    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as PaystackInitResponse;

    if (!res.ok || !json.status) {
      logger.error('Paystack init failed', { response: json });
      throw new InternalServerErrorException(`Payment initialization failed: ${json.message}`);
    }

    return json.data;
  }

  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse['data']> {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: this.headers,
    });

    const json = (await res.json()) as PaystackVerifyResponse;

    if (!res.ok || !json.status) {
      logger.error('Paystack verify failed', { reference, response: json });
      throw new InternalServerErrorException(`Payment verification failed: ${json.message}`);
    }

    return json.data;
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', env.PAYSTACK_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  }
}

export const paystackService = new PaystackService();
