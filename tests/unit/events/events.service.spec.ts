import { EventsService } from '../../../src/modules/events/services/events.service';
import { prisma } from '../../../src/config/database';
import { cacheService } from '../../../src/shared/cache/cache.service';
import { makeEvent } from '../../helpers/factories';
import { NotFoundException, ForbiddenException, BadRequestException } from '../../../src/shared/filters/http-exception';
import { EventStatus } from '@prisma/client';

jest.mock('../../../src/config/database', () => ({
  prisma: {
    event: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    ticket: { count: jest.fn() },
  },
}));
jest.mock('../../../src/shared/cache/cache.service', () => ({
  cacheService: { del: jest.fn(), delByPattern: jest.fn(), getOrSet: jest.fn() },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCache = cacheService as jest.Mocked<typeof cacheService>;

describe('EventsService', () => {
  let service: EventsService;
  beforeEach(() => { service = new EventsService(); jest.clearAllMocks(); });

  describe('findById', () => {
    it('returns from cache on hit (no DB call)', async () => {
      const event = makeEvent();
      mockCache.getOrSet.mockResolvedValue(event);
      const result = await service.findById(event.id);
      expect(result).toEqual(event);
      expect(mockPrisma.event.findUnique).not.toHaveBeenCalled();
    });

    it('fetches from DB on cache miss', async () => {
      const event = makeEvent();
      mockCache.getOrSet.mockImplementation(async (_k, f) => f());
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(event);
      await service.findById(event.id);
      expect(mockPrisma.event.findUnique).toHaveBeenCalled();
    });

    it('throws NotFoundException for missing event', async () => {
      mockCache.getOrSet.mockImplementation(async (_k, f) => f());
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findById('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when not owner', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ creatorId: 'other' }));
      await expect(service.update('event-id-1', 'creator-id-1', {})).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException for cancelled events', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ creatorId: 'creator-id-1', status: EventStatus.CANCELLED }));
      await expect(service.update('event-id-1', 'creator-id-1', {})).rejects.toThrow(BadRequestException);
    });

    it('succeeds for owned non-cancelled event', async () => {
      const event = makeEvent({ creatorId: 'creator-id-1' });
      const updated = { ...event, title: 'New Title' };
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(event);
      (mockPrisma.event.update as jest.Mock).mockResolvedValue(updated);
      mockCache.del.mockResolvedValue(undefined);
      mockCache.delByPattern.mockResolvedValue(undefined);

      const result = await service.update(event.id, 'creator-id-1', { title: 'New Title' });
      expect(result.title).toBe('New Title');
    });
  });

  describe('delete', () => {
    it('deletes when no active tickets', async () => {
      const event = makeEvent({ creatorId: 'creator-id-1' });
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(event);
      (mockPrisma.ticket.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.event.delete as jest.Mock).mockResolvedValue(event);
      mockCache.del.mockResolvedValue(undefined);
      mockCache.delByPattern.mockResolvedValue(undefined);
      await expect(service.delete(event.id, 'creator-id-1')).resolves.not.toThrow();
    });

    it('throws BadRequestException when active tickets exist', async () => {
      const event = makeEvent({ creatorId: 'creator-id-1' });
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(event);
      (mockPrisma.ticket.count as jest.Mock).mockResolvedValue(3);
      await expect(service.delete(event.id, 'creator-id-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getShareLinks', () => {
    it('returns all social platform URLs', () => {
      const event = makeEvent({ shareSlug: 'my-event-slug' });
      const links = service.getShareLinks(event);
      expect(links.direct).toContain('my-event-slug');
      expect(links.twitter).toContain('twitter.com');
      expect(links.facebook).toContain('facebook.com');
      expect(links.whatsapp).toContain('wa.me');
      expect(links.linkedin).toContain('linkedin.com');
    });
  });
});
