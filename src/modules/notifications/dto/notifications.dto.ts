import { z } from 'zod';
import { NotificationChannel, ReminderUnit } from '@prisma/client';

export const SetReminderSchema = z.object({
  eventId: z.string().uuid(),
  value: z.number().int().positive().max(52), // max 52 weeks
  unit: z.nativeEnum(ReminderUnit),
  channel: z.nativeEnum(NotificationChannel).default(NotificationChannel.EMAIL),
});

export const DeleteReminderSchema = z.object({
  reminderId: z.string().uuid(),
});

export type SetReminderDto = z.infer<typeof SetReminderSchema>;
