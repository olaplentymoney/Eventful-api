import {
  generateTicketRef,
  generateShareSlug,
  generatePaystackReference,
  signPayload,
  verifyAndDecodePayload,
  hashWebhookPayload,
} from '../../../src/shared/utils/crypto';

describe('Crypto utilities', () => {
  describe('generateTicketRef', () => {
    it('should produce a ref with the event title prefix and a random suffix', () => {
      const ref = generateTicketRef('Afrobeats Nite');
      expect(ref).toMatch(/^AFRO-[A-Z0-9]{6}$/);
    });

    it('should pad short titles with X', () => {
      const ref = generateTicketRef('AB');
      expect(ref).toMatch(/^ABXX-[A-Z0-9]{6}$/);
    });

    it('should strip non-alphanumeric chars from title', () => {
      const ref = generateTicketRef('Hello, World!');
      expect(ref).toMatch(/^HELL-[A-Z0-9]{6}$/);
    });
  });

  describe('generateShareSlug', () => {
    it('should lowercase and hyphenate the title', () => {
      const slug = generateShareSlug('Lagos Tech Summit 2026');
      expect(slug).toMatch(/^lagos-tech-summit-2026-[a-f0-9]{8}$/);
    });

    it('should produce different slugs for the same title (random suffix)', () => {
      const s1 = generateShareSlug('Same Title');
      const s2 = generateShareSlug('Same Title');
      expect(s1).not.toBe(s2);
    });
  });

  describe('generatePaystackReference', () => {
    it('should produce an uppercase ref starting with EVT-', () => {
      const ref = generatePaystackReference();
      expect(ref).toMatch(/^EVT-[A-Z0-9]{16}$/);
    });

    it('should produce unique references', () => {
      const refs = new Set(Array.from({ length: 100 }, () => generatePaystackReference()));
      expect(refs.size).toBe(100);
    });
  });

  describe('signPayload / verifyAndDecodePayload', () => {
    const secret = 'test-secret-key-long-enough';
    const payload = { ticketId: 'abc', eventId: 'xyz', amount: 5000 };

    it('should sign and verify a payload round-trip', () => {
      const token = signPayload(payload, secret);
      const decoded = verifyAndDecodePayload<typeof payload>(token, secret);
      expect(decoded).toEqual(payload);
    });

    it('should return null for a tampered token', () => {
      const token = signPayload(payload, secret);
      const tampered = token.slice(0, -4) + 'AAAA';
      expect(verifyAndDecodePayload(tampered, secret)).toBeNull();
    });

    it('should return null for a token signed with a different secret', () => {
      const token = signPayload(payload, secret);
      expect(verifyAndDecodePayload(token, 'wrong-secret')).toBeNull();
    });

    it('should return null for garbage input', () => {
      expect(verifyAndDecodePayload('not-base64url-at-all', secret)).toBeNull();
    });
  });

  describe('hashWebhookPayload', () => {
    it('should produce the same hash for the same input', () => {
      const h1 = hashWebhookPayload('{"event":"charge.success"}', 'secret');
      const h2 = hashWebhookPayload('{"event":"charge.success"}', 'secret');
      expect(h1).toBe(h2);
    });

    it('should produce different hashes for different inputs', () => {
      const h1 = hashWebhookPayload('payload-a', 'secret');
      const h2 = hashWebhookPayload('payload-b', 'secret');
      expect(h1).not.toBe(h2);
    });
  });
});
