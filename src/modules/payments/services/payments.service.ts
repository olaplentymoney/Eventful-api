import { Payment, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { cacheService } from '../../../shared/cache/cache.service';
import { CacheKeys } from '../../../shared/cache/cache-keys';
import { parsePagination, buildPaginationMeta } from '../../../shared/utils/pagination';
import { generatePaystackReference } from '../../../shared/utils/crypto';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '../../../shared/filters/http-exception';
import { paystackService } from './paystack.service';
import { env } from '../../../config/env';

export class PaymentsService {
  async initiate(
    userId: string,
    eventId: string,
  ): Promise<{ payment: Payment; authorizationUrl: string }> {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status !== 'PUBLISHED')
      throw new BadRequestException('Event is not available for purchase');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await prisma.payment.findFirst({
      where: { userId, eventId, status: PaymentStatus.PENDING },
    });
    if (existing) {
      const paystackData = await paystackService.initializeTransaction({
        email: user.email,
        amount: Number(event.price),
        reference: existing.reference,
        callbackUrl: `${env.APP_URL}/payments/verify/${existing.reference}`,
        metadata: { eventId, userId, eventTitle: event.title },
      });
      return { payment: existing, authorizationUrl: paystackData.authorization_url };
    }

    const reference = generatePaystackReference();
    const paystackData = await paystackService.initializeTransaction({
      email: user.email,
      amount: Number(event.price),
      reference,
      callbackUrl: `${env.APP_URL}/payments/verify/${reference}`,
      metadata: { eventId, userId, eventTitle: event.title },
    });

    const payment = await prisma.payment.create({
      data: {
        reference,
        eventId,
        userId,
        amount: event.price,
        currency: event.currency,
        status: PaymentStatus.PENDING,
        metadata: { paystackAccessCode: paystackData.access_code },
      },
    });

    return { payment, authorizationUrl: paystackData.authorization_url };
  }

  async verify(reference: string, userId: string): Promise<Payment> {
    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.userId !== userId) throw new ForbiddenException('Access denied');
    if (payment.status === PaymentStatus.SUCCESSFUL) return payment;

    const paystackData = await paystackService.verifyTransaction(reference);
    const newStatus =
      paystackData.status === 'success' ? PaymentStatus.SUCCESSFUL : PaymentStatus.FAILED;

    const updated = await prisma.payment.update({
      where: { reference },
      data: {
        status: newStatus,
        paystackId: String(paystackData.id),
        channel: paystackData.channel,
        paidAt: paystackData.paid_at ? new Date(paystackData.paid_at) : null,
        paystackResponse: paystackData as unknown as Prisma.InputJsonValue,
      },
    });

    await cacheService.del(CacheKeys.PAYMENT(reference));
    return updated;
  }

  async handleWebhook(event: string, data: Record<string, unknown>): Promise<void> {
    if (event !== 'charge.success') return;
    const reference = data.reference as string;
    if (!reference) return;

    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment || payment.status === PaymentStatus.SUCCESSFUL) return;

    await prisma.payment.update({
      where: { reference },
      data: {
        status: PaymentStatus.SUCCESSFUL,
        paystackId: String(data.id),
        channel: data.channel as string,
        paidAt: data.paid_at ? new Date(data.paid_at as string) : new Date(),
        paystackResponse: data as unknown as Prisma.InputJsonValue,
      },
    });

    await cacheService.del(CacheKeys.PAYMENT(reference));
  }

  async getMyPayments(
    userId: string,
    query: { page?: number; limit?: number },
  ): Promise<{ payments: any[]; meta: any }> {
    const { page, limit, skip } = parsePagination(query);
    const payments = await prisma.payment.findMany({
      where: { userId },
      skip,
      take: limit,
      include: { event: { select: { id: true, title: true, startDate: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const total = await prisma.payment.count({ where: { userId } });
    return { payments, meta: buildPaginationMeta(total, page, limit) };
  }

  async getEventPayments(
    eventId: string,
    creatorId: string,
    query: { page?: number; limit?: number },
  ): Promise<{ payments: any[]; meta: any }> {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.creatorId !== creatorId) throw new ForbiddenException('Access denied');

    const { page, limit, skip } = parsePagination(query);
    const payments = await prisma.payment.findMany({
      where: { eventId, status: PaymentStatus.SUCCESSFUL },
      skip,
      take: limit,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { paidAt: 'desc' },
    });
    const total = await prisma.payment.count({
      where: { eventId, status: PaymentStatus.SUCCESSFUL },
    });
    return { payments, meta: buildPaginationMeta(total, page, limit) };
  }

  async getPaymentByReference(reference: string, userId: string): Promise<Payment> {
    return cacheService.getOrSet(
      CacheKeys.PAYMENT(reference),
      async () => {
        const payment = await prisma.payment.findUnique({ where: { reference } });
        if (!payment) throw new NotFoundException('Payment not found');
        if (payment.userId !== userId) throw new ForbiddenException('Access denied');
        return payment;
      },
      120,
    );
  }
}

export const paymentsService = new PaymentsService();
