import { Ticket, TicketStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../../config/database';
import { cacheService } from '../../../shared/cache/cache.service';
import { CacheKeys } from '../../../shared/cache/cache-keys';
import { parsePagination, buildPaginationMeta } from '../../../shared/utils/pagination';
import { generateTicketRef } from '../../../shared/utils/crypto';
import { notificationsService } from '../../notifications/services/notifications.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '../../../shared/filters/http-exception';
import { qrCodeService } from './qr-code.service';
import { VerifyTicketDto } from '../dto/tickets.dto';

export class TicketsService {
  async issueTicket(userId: string, eventId: string, paymentReference: string): Promise<Ticket> {
    const payment = await prisma.payment.findUnique({ where: { reference: paymentReference } });
    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.status !== PaymentStatus.SUCCESSFUL)
      throw new BadRequestException('Payment has not been completed');
    if (payment.userId !== userId) throw new ForbiddenException('Payment does not belong to you');
    if (payment.eventId !== eventId) throw new BadRequestException('Payment event mismatch');
    if (payment.ticketId) throw new ConflictException('Ticket already issued for this payment');

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    const soldCount = await prisma.ticket.count({
      where: { eventId, status: { in: [TicketStatus.ACTIVE, TicketStatus.USED] } },
    });
    if (soldCount >= event.capacity) throw new BadRequestException('Event is sold out');

    const existingTicket = await prisma.ticket.findFirst({
      where: { userId, eventId, status: TicketStatus.ACTIVE },
    });
    if (existingTicket)
      throw new ConflictException('You already have an active ticket for this event');

    const ticketRef = generateTicketRef(event.title);
    const ticketId = crypto.randomUUID();

    const { qrCodeData, qrCodeUrl } = await qrCodeService.generateTicketQr({
      ticketId,
      eventId,
      userId,
      ticketRef,
    });

    const ticket = await prisma.$transaction(async (tx: any) => {
      const t = await tx.ticket.create({
        data: {
          id: ticketId,
          ticketRef,
          eventId,
          userId,
          qrCodeData,
          qrCodeUrl,
          price: event.price,
          currency: event.currency,
        },
      });
      await tx.payment.update({ where: { reference: paymentReference }, data: { ticketId: t.id } });
      return t;
    });

    await Promise.all([
      cacheService.del(CacheKeys.TICKETS_BY_USER(userId)),
      cacheService.del(CacheKeys.TICKETS_BY_EVENT(eventId)),
      cacheService.del(CacheKeys.ANALYTICS_EVENT(eventId)),
    ]);

    // Send confirmation email — non-blocking
    notificationsService
      .sendTicketConfirmation({
        userId,
        eventId,
        ticketRef: ticket.ticketRef,
        qrCodeUrl: ticket.qrCodeUrl ?? '',
      })
      .catch(() => {});

    return ticket;
  }

  async findMyTickets(
    userId: string,
    query: { page?: number; limit?: number },
  ): Promise<{ tickets: any[]; meta: any }> {
    const { page, limit, skip } = parsePagination(query);
    const tickets = await prisma.ticket.findMany({
      where: { userId },
      skip,
      take: limit,
      include: {
        event: { select: { id: true, title: true, startDate: true, venue: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const total = await prisma.ticket.count({ where: { userId } });
    return { tickets, meta: buildPaginationMeta(total, page, limit) };
  }

  async findTicketById(id: string, userId: string): Promise<Ticket> {
    const ticket = await prisma.ticket.findUnique({ where: { id }, include: { event: true } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId) throw new ForbiddenException('Access denied');
    return ticket;
  }

  async findEventTickets(
    eventId: string,
    creatorId: string,
    query: { page?: number; limit?: number },
  ): Promise<{ tickets: any[]; meta: any }> {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.creatorId !== creatorId) throw new ForbiddenException('Access denied');

    const { page, limit, skip } = parsePagination(query);
    const tickets = await prisma.ticket.findMany({
      where: { eventId },
      skip,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const total = await prisma.ticket.count({ where: { eventId } });
    return { tickets, meta: buildPaginationMeta(total, page, limit) };
  }

  async verifyAndScanTicket(dto: VerifyTicketDto, creatorId: string): Promise<Ticket> {
    const payload = qrCodeService.verifyQrCode(dto.qrToken);
    if (!payload) throw new BadRequestException('Invalid or tampered QR code');

    const ticket = await prisma.ticket.findUnique({
      where: { id: payload.ticketId },
      include: { event: true },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const event = await prisma.event.findUnique({ where: { id: ticket.eventId } });
    if (!event || event.creatorId !== creatorId)
      throw new ForbiddenException('You cannot scan tickets for this event');

    if (ticket.status === TicketStatus.USED)
      throw new ConflictException(`Ticket already scanned at ${ticket.scannedAt?.toISOString()}`);
    if (ticket.status === TicketStatus.CANCELLED || ticket.status === TicketStatus.REFUNDED) {
      throw new BadRequestException(`Ticket is ${ticket.status.toLowerCase()}`);
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.USED,
        scannedAt: new Date(),
        scannedBy: dto.scannedBy ?? creatorId,
      },
    });

    await cacheService.del(CacheKeys.ANALYTICS_EVENT(ticket.eventId));
    return updated;
  }

  async cancelTicket(id: string, userId: string): Promise<Ticket> {
    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId) throw new ForbiddenException('Access denied');
    if (ticket.status !== TicketStatus.ACTIVE)
      throw new BadRequestException(`Cannot cancel a ${ticket.status.toLowerCase()} ticket`);

    const updated = await prisma.ticket.update({
      where: { id },
      data: { status: TicketStatus.CANCELLED },
    });
    await cacheService.del(CacheKeys.TICKETS_BY_USER(userId));
    return updated;
  }
}

export const ticketsService = new TicketsService();
