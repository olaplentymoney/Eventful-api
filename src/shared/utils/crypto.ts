import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export function generateTicketRef(eventTitle: string): string {
  const prefix = eventTitle
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');
  const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

export function generatePaystackReference(): string {
  return `EVT-${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}`;
}

export function generateShareSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  const suffix = crypto.randomBytes(4).toString('hex');
  return `${base}-${suffix}`;
}

export function signPayload(payload: object, secret: string): string {
  const data = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  const signature = hmac.digest('hex');
  return Buffer.from(JSON.stringify({ data, signature })).toString('base64url');
}

export function verifyAndDecodePayload<T>(token: string, secret: string): T | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    const { data, signature } = decoded as { data: string; signature: string };
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    const expected = hmac.digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      return null;
    }
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export function hashWebhookPayload(rawBody: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
}
