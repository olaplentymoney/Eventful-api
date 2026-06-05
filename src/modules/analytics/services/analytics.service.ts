import { prisma } from '../../../config/database';
import { cacheService } from '../../../shared/cache/cache.service';
import { CacheKeys } from '../../../shared/cache/cache-keys';
import { NotFoundException, ForbiddenException } from '../../../shared/filters/http-exception';
import { PaymentStatus, TicketStatus } from '@prisma/client';

export interface CreatorAnalytics {
  totalEvents: number;
  publishedEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  totalAttendees: number;
  ticketScanRate: number;
  recentEvents: EventAnalytics[];
}

export interface EventAnalytics {
  eventId: string;
  title: string;
  startDate: Date;
  capacity: number;
  ticketsSold: number;
  ticketsScanned: number;
  scanRate: number;
  revenue: number;
  occupancyRate: number;
}

export class AnalyticsService {
  async getCreatorAnalytics(creatorId: string): Promise<CreatorAnalytics> {
    return cacheService.getOrSet(CacheKeys.ANALYTICS_CREATOR(creatorId), () => this.computeCreatorAnalytics(creatorId), 300);
  }

  async getEventAnalytics(eventId: string, creatorId: string): Promise<EventAnalytics> {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.creatorId !== creatorId) throw new ForbiddenException('Access denied');
    return cacheService.getOrSet(CacheKeys.ANALYTICS_EVENT(eventId), () => this.computeEventAnalytics(eventId), 120);
  }

  private async computeCreatorAnalytics(creatorId: string): Promise<CreatorAnalytics> {
    const events = await prisma.event.findMany({ where: { creatorId } });
    const eventIds = events.map((e: any) => e.id);

    if (eventIds.length === 0) {
      return { totalEvents: 0, publishedEvents: 0, totalTicketsSold: 0, totalRevenue: 0, totalAttendees: 0, ticketScanRate: 0, recentEvents: [] };
    }

    const [ticketsSold, ticketsScanned, payments] = await Promise.all([
      prisma.ticket.count({ where: { eventId: { in: eventIds }, status: { in: [TicketStatus.ACTIVE, TicketStatus.USED] } } }),
      prisma.ticket.count({ where: { eventId: { in: eventIds }, status: TicketStatus.USED } }),
      prisma.payment.aggregate({ where: { eventId: { in: eventIds }, status: PaymentStatus.SUCCESSFUL }, _sum: { amount: true } }),
    ]);

    const recentEvents = await Promise.all(events.slice(0, 5).map((e: any) => this.computeEventAnalytics(e.id)));

    return {
      totalEvents: events.length,
      publishedEvents: events.filter((e: any) => e.status === 'PUBLISHED').length,
      totalTicketsSold: ticketsSold,
      totalRevenue: Number(payments._sum.amount as any ?? 0),
      totalAttendees: ticketsScanned,
      ticketScanRate: ticketsSold > 0 ? Math.round((ticketsScanned / ticketsSold) * 100) : 0,
      recentEvents,
    };
  }

  private async computeEventAnalytics(eventId: string): Promise<EventAnalytics> {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');

    const [ticketsSold, ticketsScanned, revenue] = await Promise.all([
      prisma.ticket.count({ where: { eventId, status: { in: [TicketStatus.ACTIVE, TicketStatus.USED] } } }),
      prisma.ticket.count({ where: { eventId, status: TicketStatus.USED } }),
      prisma.payment.aggregate({ where: { eventId, status: PaymentStatus.SUCCESSFUL }, _sum: { amount: true } }),
    ]);

    return {
      eventId,
      title: event.title,
      startDate: event.startDate,
      capacity: event.capacity,
      ticketsSold,
      ticketsScanned,
      scanRate: ticketsSold > 0 ? Math.round((ticketsScanned / ticketsSold) * 100) : 0,
      revenue: Number(revenue._sum.amount as any ?? 0),
      occupancyRate: event.capacity > 0 ? Math.round((ticketsSold / event.capacity) * 100) : 0,
    };
  }
}

export const analyticsService = new AnalyticsService();
