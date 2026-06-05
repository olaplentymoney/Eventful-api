import { Reminder, NotificationChannel } from '@prisma/client';
import { prisma } from '../../../config/database';
import { reminderQueue, emailQueue } from '../../../config/queue';
import { getReminderFireDate, msUntil } from '../../../shared/utils/date-helpers';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '../../../shared/filters/http-exception';
import { SetReminderDto } from '../dto/notifications.dto';
import { logger } from '../../../config/logger';

export class NotificationsService {
  async setReminder(userId: string, dto: SetReminderDto): Promise<Reminder> {
    const event = await prisma.event.findUnique({ where: { id: dto.eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.startDate <= new Date()) throw new BadRequestException('Event has already started');

    const hasAccess = await this.userHasEventAccess(userId, dto.eventId);
    if (!hasAccess)
      throw new ForbiddenException('You must have a ticket or own the event to set a reminder');

    const existing = await prisma.reminder.findUnique({
      where: {
        eventId_userId_value_unit: {
          eventId: dto.eventId,
          userId,
          value: dto.value,
          unit: dto.unit,
        },
      },
    });
    if (existing) throw new ConflictException('Reminder already set for this interval');

    const fireDate = getReminderFireDate(event.startDate, dto.value, dto.unit);
    if (fireDate <= new Date()) throw new BadRequestException('Reminder date has already passed');

    const delay = msUntil(fireDate);
    const tempJobId = `reminder-temp-${userId}-${dto.eventId}-${dto.value}-${dto.unit}`;

    await reminderQueue.add(
      'send-reminder',
      { userId, eventId: dto.eventId },
      { delay, jobId: tempJobId },
    );

    const reminder = await prisma.reminder.create({
      data: {
        eventId: dto.eventId,
        userId,
        value: dto.value,
        unit: dto.unit,
        channel: dto.channel,
        jobId: tempJobId,
      },
    });

    return reminder;
  }

  async deleteReminder(reminderId: string, userId: string): Promise<void> {
    const reminder = await prisma.reminder.findUnique({ where: { id: reminderId } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    if (reminder.userId !== userId) throw new ForbiddenException('Access denied');

    if (reminder.jobId) {
      try {
        const job = await reminderQueue.getJob(reminder.jobId);
        if (job) await job.remove();
      } catch (err) {
        logger.warn('Could not remove reminder job', { jobId: reminder.jobId, error: err });
      }
    }

    await prisma.reminder.delete({ where: { id: reminderId } });
  }

  async getMyReminders(userId: string, eventId?: string): Promise<Reminder[]> {
    return prisma.reminder.findMany({
      where: { userId, ...(eventId ? { eventId } : {}) },
      include: { event: { select: { id: true, title: true, startDate: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async processReminder(reminderId: string): Promise<void> {
    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId },
      include: { event: true, user: { select: { id: true, name: true, email: true } } },
    });

    if (!reminder || reminder.sentAt) return;

    const payload = {
      to: reminder.user.email,
      name: reminder.user.name,
      eventTitle: reminder.event.title,
      eventDate: reminder.event.startDate,
      eventVenue: reminder.event.venue,
      eventCity: reminder.event.city,
      eventId: reminder.eventId,
      reminderValue: reminder.value,
      reminderUnit: reminder.unit,
    };

    if (
      reminder.channel === NotificationChannel.EMAIL ||
      reminder.channel === NotificationChannel.BOTH
    ) {
      await emailQueue.add('reminder-email', payload, { attempts: 3 });
    }

    await prisma.reminder.update({ where: { id: reminderId }, data: { sentAt: new Date() } });
  }

  async sendTicketConfirmation(params: {
    userId: string;
    eventId: string;
    ticketRef: string;
    qrCodeUrl: string;
  }): Promise<void> {
    const [user, event] = await Promise.all([
      prisma.user.findUnique({ where: { id: params.userId } }),
      prisma.event.findUnique({ where: { id: params.eventId } }),
    ]);
    if (!user || !event) return;

    await emailQueue.add(
      'ticket-confirmation',
      {
        to: user.email,
        name: user.name,
        eventTitle: event.title,
        eventDate: event.startDate,
        eventVenue: event.venue,
        eventCity: event.city,
        ticketRef: params.ticketRef,
        qrCodeUrl: params.qrCodeUrl,
      },
      { attempts: 3 },
    );
  }

  private async userHasEventAccess(userId: string, eventId: string): Promise<boolean> {
    const [ticket, event] = await Promise.all([
      prisma.ticket.findFirst({
        where: { userId, eventId, status: { in: ['ACTIVE', 'USED'] } },
      }),
      prisma.event.findUnique({ where: { id: eventId } }),
    ]);
    return !!(ticket || event?.creatorId === userId);
  }
}

export const notificationsService = new NotificationsService();
