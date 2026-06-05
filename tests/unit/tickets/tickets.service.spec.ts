import { TicketsService } from '../../../src/modules/tickets/services/tickets.service';
import { prisma } from '../../../src/config/database';
import { cacheService } from '../../../src/shared/cache/cache.service';
import { makeEvent, makeTicket, makePayment, makeUser } from '../../helpers/factories';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '../../../src/shared/filters/http-exception';
import { PaymentStatus, TicketStatus } from '@prisma/client';

jest.mock('../../../src/config/database', () => ({
  prisma: {
    payment: { findUnique: jest.fn(), update: jest.fn() },
    event: { findUnique: jest.fn() },
    ticket: { count: jest.fn(), findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('../../../src/shared/cache/cache.service', () => ({
  cacheService: { del: jest.fn() },
}));
jest.mock('../../../src/modules/tickets/services/qr-code.service', () => ({
  qrCodeService: { generateTicketQr: jest.fn().mockResolvedValue({ qrCodeData: 'signed-data', qrCodeUrl: 'data:image/png;base64,abc' }), verifyQrCode: jest.fn() },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCache = cacheService as jest.Mocked<typeof cacheService>;

describe('TicketsService', () => {
  let service: TicketsService;
  beforeEach(() => { service = new TicketsService(); jest.clearAllMocks(); });

  describe('issueTicket', () => {
    const userId = 'user-id-1';
    const eventId = 'event-id-1';
    const paymentRef = 'EVT-REF001';

    it('throws NotFoundException when payment not found', async () => {
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.issueTicket(userId, eventId, paymentRef)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when payment not successful', async () => {
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(makePayment({ status: PaymentStatus.PENDING }));
      await expect(service.issueTicket(userId, eventId, paymentRef)).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when payment belongs to different user', async () => {
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(makePayment({ userId: 'different-user' }));
      await expect(service.issueTicket(userId, eventId, paymentRef)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when ticket already issued for payment', async () => {
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(makePayment({ ticketId: 'existing-ticket' }));
      await expect(service.issueTicket(userId, eventId, paymentRef)).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when event is sold out', async () => {
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(makePayment({ ticketId: null }));
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ capacity: 2 }));
      (mockPrisma.ticket.count as jest.Mock).mockResolvedValue(2); // at capacity
      await expect(service.issueTicket(userId, eventId, paymentRef)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when user already has active ticket', async () => {
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(makePayment({ ticketId: null }));
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ capacity: 100 }));
      (mockPrisma.ticket.count as jest.Mock).mockResolvedValue(10);
      (mockPrisma.ticket.findFirst as jest.Mock).mockResolvedValue(makeTicket()); // already has ticket
      await expect(service.issueTicket(userId, eventId, paymentRef)).rejects.toThrow(ConflictException);
    });

    it('issues ticket and links payment on success', async () => {
      const ticket = makeTicket();
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(makePayment({ ticketId: null }));
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ capacity: 100 }));
      (mockPrisma.ticket.count as jest.Mock).mockResolvedValue(5);
      (mockPrisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) => fn(mockPrisma));
      (mockPrisma.ticket.create as jest.Mock).mockResolvedValue(ticket);
      (mockPrisma.payment.update as jest.Mock).mockResolvedValue({});
      mockCache.del.mockResolvedValue(undefined);

      const result = await service.issueTicket(userId, eventId, paymentRef);
      expect(result).toEqual(ticket);
    });
  });

  describe('verifyAndScanTicket', () => {
    const { qrCodeService } = require('../../../src/modules/tickets/services/qr-code.service');

    it('throws BadRequestException for invalid QR', async () => {
      qrCodeService.verifyQrCode.mockReturnValue(null);
      await expect(service.verifyAndScanTicket({ qrToken: 'bad' }, 'creator-id-1')).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException for already-scanned ticket', async () => {
      qrCodeService.verifyQrCode.mockReturnValue({ ticketId: 'ticket-id-1', eventId: 'event-id-1' });
      (mockPrisma.ticket.findUnique as jest.Mock).mockResolvedValue(makeTicket({ status: TicketStatus.USED }));
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ creatorId: 'creator-id-1' }));
      await expect(service.verifyAndScanTicket({ qrToken: 'valid' }, 'creator-id-1')).rejects.toThrow(ConflictException);
    });
  });
});
