import { QrCodeService } from '../../../src/modules/tickets/services/qr-code.service';

jest.mock('../../../src/config/env', () => ({
  env: {
    QR_SECRET: 'test-qr-secret-1234567890abcdef',
    NODE_ENV: 'test',
  },
}));

describe('QrCodeService', () => {
  let service: QrCodeService;

  beforeEach(() => {
    service = new QrCodeService();
  });

  const payload = {
    ticketId: 'ticket-123',
    eventId: 'event-456',
    userId: 'user-789',
    ticketRef: 'TEST-ABCDEF',
  };

  describe('generateTicketQr', () => {
    it('returns a signed qrCodeData string and a base64 qrCodeUrl', async () => {
      const result = await service.generateTicketQr(payload);
      expect(result.qrCodeData).toBeDefined();
      expect(result.qrCodeUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('produces different qrCodeData on each call (due to issuedAt timestamp)', async () => {
      const r1 = await service.generateTicketQr(payload);
      await new Promise((r) => setTimeout(r, 5));
      const r2 = await service.generateTicketQr(payload);
      expect(r1.qrCodeData).not.toBe(r2.qrCodeData);
    });
  });

  describe('verifyQrCode', () => {
    it('returns the original payload for a valid token', async () => {
      const { qrCodeData } = await service.generateTicketQr(payload);
      const decoded = service.verifyQrCode(qrCodeData);

      expect(decoded).not.toBeNull();
      expect(decoded!.ticketId).toBe(payload.ticketId);
      expect(decoded!.eventId).toBe(payload.eventId);
      expect(decoded!.userId).toBe(payload.userId);
    });

    it('returns null for a tampered token', () => {
      const tampered = 'eyJ0YW1wZXJlZCI6dHJ1ZX0=';
      expect(service.verifyQrCode(tampered)).toBeNull();
    });

    it('returns null for an empty string', () => {
      expect(service.verifyQrCode('')).toBeNull();
    });

    it('returns null when signature does not match (modified data)', () => {
      const corrupted =
        'eyJkYXRhIjoie1widGFtcGVyZWRcIjp0cnVlfSIsInNpZ25hdHVyZSI6ImZha2VzaWduYXR1cmUifQ';
      expect(service.verifyQrCode(corrupted)).toBeNull();
    });
  });
});
