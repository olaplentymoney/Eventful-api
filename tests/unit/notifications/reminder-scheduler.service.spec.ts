import { NotificationsService } from '../../../src/modules/notifications/services/notifications.service';
import { prisma } from '../../../src/config/database';
import { reminderQueue, emailQueue } from '../../../src/config/queue';
import { makeEvent, makeUser } from '../../helpers/factories';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '../../../src/shared/filters/http-exception';
import { NotificationChannel, ReminderUnit } from '@prisma/client';

jest.mock('../../../src/config/database', () => ({
  prisma: {
    event: { findUnique: jest.fn() },
    ticket: { findFirst: jest.fn() },
    reminder: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));
jest.mock('../../../src/config/queue', () => ({
  reminderQueue: { add: jest.fn().mockResolvedValue({ id: 'job-123' }), getJob: jest.fn() },
  emailQueue: { add: jest.fn().mockResolvedValue({ id: 'email-job-1' }) },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockReminderQueue = reminderQueue as jest.Mocked<typeof reminderQueue>;

describe('NotificationsService', () => {
  let service: NotificationsService;
  beforeEach(() => { service = new NotificationsService(); jest.clearAllMocks(); });

  describe('setReminder', () => {
    const dto = { eventId: 'event-id-1', value: 1, unit: ReminderUnit.DAYS, channel: NotificationChannel.EMAIL };

    it('throws NotFoundException when event not found', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.setReminder('user-id-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for past event', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ startDate: new Date('2020-01-01') }));
      await expect(service.setReminder('user-id-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when user has no ticket or ownership', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(makeEvent({ creatorId: 'other' }));
      (mockPrisma.ticket.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.setReminder('user-id-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException for duplicate reminder', async () => {
      const futureEvent = makeEvent({ startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(futureEvent);
      (mockPrisma.ticket.findFirst as jest.Mock).mockResolvedValue({ id: 'ticket-id' });
      (mockPrisma.reminder.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-reminder' });
      await expect(service.setReminder('user-id-1', dto)).rejects.toThrow(ConflictException);
    });

    it('schedules a BullMQ job and creates reminder record', async () => {
      const futureEvent = makeEvent({ startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(futureEvent);
      (mockPrisma.ticket.findFirst as jest.Mock).mockResolvedValue({ id: 'ticket-id' });
      (mockPrisma.reminder.findUnique as jest.Mock).mockResolvedValue(null);
      const createdReminder = { id: 'reminder-id-1', ...dto, userId: 'user-id-1', jobId: 'job-123', sentAt: null, createdAt: new Date(), updatedAt: new Date() };
      (mockPrisma.reminder.create as jest.Mock).mockResolvedValue(createdReminder);

      const result = await service.setReminder('user-id-1', dto);

      expect(mockReminderQueue.add).toHaveBeenCalled();
      expect(mockPrisma.reminder.create).toHaveBeenCalled();
      expect(result.id).toBe('reminder-id-1');
    });
  });

  describe('deleteReminder', () => {
    it('throws NotFoundException for missing reminder', async () => {
      (mockPrisma.reminder.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.deleteReminder('bad-id', 'user-id-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for reminder owned by different user', async () => {
      (mockPrisma.reminder.findUnique as jest.Mock).mockResolvedValue({ id: 'r1', userId: 'other-user', jobId: null });
      await expect(service.deleteReminder('r1', 'user-id-1')).rejects.toThrow(ForbiddenException);
    });

    it('cancels BullMQ job and deletes reminder', async () => {
      const mockJob = { remove: jest.fn() };
      (mockPrisma.reminder.findUnique as jest.Mock).mockResolvedValue({ id: 'r1', userId: 'user-id-1', jobId: 'job-123' });
      (mockReminderQueue.getJob as jest.Mock).mockResolvedValue(mockJob);
      (mockPrisma.reminder.delete as jest.Mock).mockResolvedValue({});

      await service.deleteReminder('r1', 'user-id-1');

      expect(mockJob.remove).toHaveBeenCalled();
      expect(mockPrisma.reminder.delete).toHaveBeenCalled();
    });
  });
});
