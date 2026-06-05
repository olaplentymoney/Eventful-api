import { PaymentsService } from '../../../src/modules/payments/services/payments.service';
import { prisma } from '../../../src/config/database';
import { cacheService } from '../../../src/shared/cache/cache.service';
import { makeEvent, makePayment, makeUser } from '../../helpers/factories';
import { NotFoundException, ForbiddenException, BadRequestException } from '../../../src/shared/filters/http-exception';
import { EventStatus, PaymentStatus } from '@prisma/client';

jest.mock('../../../src/config/database', () => ({
  prisma: {
    event: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    payment: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));
jest.mock('../../../src/shared/cache/cache.service', () => ({
  cacheService: { del: jest.fn(), getOrSet: jest.fn() },
}));
jest.mock('../../../src/modules/payments/services/paystack.service', () => ({
  paystackService: {
    initializeTransaction: jest.fn().mockResolvedValue({ authorization_url: 'https://paystack.io/pay/abc', access_code: 'access123' }),
    verifyTransaction: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCache = cacheService as jest.Mocked<typeof cacheService>;

describe('PaymentsService', () => {
  let service: PaymentsService;
  beforeEach(() => { service = new PaymentsService(); jest.clearAllMocks(); });

  describe('initiate', () => {
    it('throws NotFoundException when event not found', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.initiate('user-id-1', 'bad-event')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for unpublished event', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ status: EventStatus.DRAFT }));
      await expect(service.initiate('user-id-1', 'event-id-1')).rejects.toThrow(BadRequestException);
    });

    it('creates payment record and returns authorization URL', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ status: EventStatus.PUBLISHED }));
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.payment.create as jest.Mock).mockResolvedValue(makePayment({ status: PaymentStatus.PENDING }));

      const result = await service.initiate('user-id-1', 'event-id-1');
      expect(result.authorizationUrl).toContain('paystack');
      expect(result.payment).toBeDefined();
    });
  });

  describe('verify', () => {
    const { paystackService } = require('../../../src/modules/payments/services/paystack.service');

    it('returns existing successful payment without re-verifying', async () => {
      const payment = makePayment({ status: PaymentStatus.SUCCESSFUL });
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(payment);
      const result = await service.verify(payment.reference, payment.userId);
      expect(result.status).toBe(PaymentStatus.SUCCESSFUL);
      expect(paystackService.verifyTransaction).not.toHaveBeenCalled();
    });

    it('calls Paystack and updates status for pending payment', async () => {
      const payment = makePayment({ status: PaymentStatus.PENDING });
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(payment);
      paystackService.verifyTransaction.mockResolvedValue({ status: 'success', id: 999, channel: 'card', paid_at: new Date().toISOString() });
      (mockPrisma.payment.update as jest.Mock).mockResolvedValue({ ...payment, status: PaymentStatus.SUCCESSFUL });
      mockCache.del.mockResolvedValue(undefined);

      const result = await service.verify(payment.reference, payment.userId);
      expect(result.status).toBe(PaymentStatus.SUCCESSFUL);
    });

    it('throws ForbiddenException when user does not own payment', async () => {
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(makePayment({ userId: 'other-user' }));
      await expect(service.verify('REF', 'user-id-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('handleWebhook', () => {
    it('ignores non-charge.success events', async () => {
      await service.handleWebhook('charge.failed', { reference: 'REF' });
      expect(mockPrisma.payment.findUnique).not.toHaveBeenCalled();
    });

    it('marks payment successful on charge.success', async () => {
      const payment = makePayment({ status: PaymentStatus.PENDING });
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(payment);
      (mockPrisma.payment.update as jest.Mock).mockResolvedValue({ ...payment, status: PaymentStatus.SUCCESSFUL });
      mockCache.del.mockResolvedValue(undefined);

      await service.handleWebhook('charge.success', { reference: payment.reference, id: 999, channel: 'card', paid_at: new Date().toISOString() });
      expect(mockPrisma.payment.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { reference: payment.reference },
        data: expect.objectContaining({ status: PaymentStatus.SUCCESSFUL }),
      }));
    });

    it('is idempotent — skips already successful payments', async () => {
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(makePayment({ status: PaymentStatus.SUCCESSFUL }));
      await service.handleWebhook('charge.success', { reference: 'REF' });
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
    });
  });
});
