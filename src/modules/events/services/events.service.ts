import { Event, EventStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { env } from '../../../config/env';
import { cacheService } from '../../../shared/cache/cache.service';
import { CacheKeys } from '../../../shared/cache/cache-keys';
import { parsePagination, buildPaginationMeta } from '../../../shared/utils/pagination';
import { generateShareSlug } from '../../../shared/utils/crypto';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '../../../shared/filters/http-exception';
import { CreateEventDto, UpdateEventDto, QueryEventsDto } from '../dto/events.dto';

export interface EventShareLinks {
  direct: string;
  twitter: string;
  facebook: string;
  whatsapp: string;
  linkedin: string;
}

export class EventsService {
  async create(creatorId: string, dto: CreateEventDto): Promise<Event> {
    const shareSlug = generateShareSlug(dto.title);
    const { defaultReminderDays, ...eventData } = dto;
    const event = await prisma.event.create({
      data: { ...eventData, shareSlug, creatorId },
    });
    await cacheService.del(CacheKeys.EVENTS_BY_CREATOR(creatorId));
    return event;
  }

  async findAll(query: QueryEventsDto): Promise<{ events: any[]; meta: any }> {
    const { page, limit, skip } = parsePagination(query);

    const where: Prisma.EventWhereInput = {
      status: query.status ?? EventStatus.PUBLISHED,
    };
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
    if (query.country) where.country = { contains: query.country, mode: 'insensitive' };
    if (query.startDate) where.startDate = { gte: query.startDate };
    if (query.endDate) where.endDate = { lte: query.endDate };
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { venue: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.tags) {
      const tagList = query.tags.split(',').map((t) => t.trim());
      where.tags = { hasSome: tagList };
    }

    const cacheKey = CacheKeys.EVENTS_LIST(page, limit, JSON.stringify(where));

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const events = await prisma.event.findMany({
          where,
          skip,
          take: limit,
          orderBy: { startDate: 'asc' },
        });
        const total = await prisma.event.count({ where });
        return { events, meta: buildPaginationMeta(total, page, limit) };
      },
      120,
    );
  }

  async findById(id: string): Promise<Event> {
    return cacheService.getOrSet(
      CacheKeys.EVENT(id),
      async () => {
        const event = await prisma.event.findUnique({
          where: { id },
          include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
        });
        if (!event) throw new NotFoundException('Event not found');
        return event;
      },
      300,
    );
  }

  async findBySlug(slug: string): Promise<Event> {
    return cacheService.getOrSet(
      CacheKeys.EVENT_SHARE(slug),
      async () => {
        const event = await prisma.event.findUnique({
          where: { shareSlug: slug },
          include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
        });
        if (!event) throw new NotFoundException('Event not found');
        return event;
      },
      300,
    );
  }

  async findByCreator(
    creatorId: string,
    query: QueryEventsDto,
  ): Promise<{ events: any[]; meta: any }> {
    const { page, limit, skip } = parsePagination(query);

    const where: Prisma.EventWhereInput = { creatorId };
    if (query.status) where.status = query.status;

    const events = await prisma.event.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    const total = await prisma.event.count({ where });

    return { events, meta: buildPaginationMeta(total, page, limit) };
  }

  async update(id: string, creatorId: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.assertOwnership(id, creatorId);
    if (event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a cancelled event');
    }
    const updated = await prisma.event.update({ where: { id }, data: { ...dto } });
    await this.bustEventCache(id, updated.shareSlug, creatorId);
    return updated;
  }

  async delete(id: string, creatorId: string): Promise<void> {
    const event = await this.assertOwnership(id, creatorId);
    const ticketCount = await prisma.ticket.count({
      where: { eventId: id, status: { in: ['ACTIVE', 'USED'] } },
    });
    if (ticketCount > 0) {
      throw new BadRequestException(
        'Cannot delete an event with active tickets. Cancel it instead.',
      );
    }
    await prisma.event.delete({ where: { id } });
    await this.bustEventCache(id, event.shareSlug, creatorId);
  }

  async cancel(id: string, creatorId: string): Promise<Event> {
    await this.assertOwnership(id, creatorId);
    const updated = await prisma.event.update({
      where: { id },
      data: { status: EventStatus.CANCELLED },
    });
    await this.bustEventCache(id, updated.shareSlug, creatorId);
    return updated;
  }

  getShareLinks(event: Event): EventShareLinks {
    const url = `${env.APP_URL}/events/${event.shareSlug}`;
    const text = encodeURIComponent(`Check out ${event.title} on Eventful!`);
    const encodedUrl = encodeURIComponent(url);
    return {
      direct: url,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${text}%20${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };
  }

  private async assertOwnership(id: string, creatorId: string): Promise<Event> {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.creatorId !== creatorId) throw new ForbiddenException('You do not own this event');
    return event;
  }

  private async bustEventCache(id: string, slug: string, creatorId: string): Promise<void> {
    await Promise.all([
      cacheService.del(CacheKeys.EVENT(id)),
      cacheService.del(CacheKeys.EVENT_SHARE(slug)),
      cacheService.del(CacheKeys.EVENTS_BY_CREATOR(creatorId)),
      cacheService.delByPattern('events:list:*'),
    ]);
  }
}

export const eventsService = new EventsService();
