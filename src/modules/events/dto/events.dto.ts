import { z } from 'zod';
import { EventStatus } from '@prisma/client';

export const CreateEventSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(5000),
    venue: z.string().min(2).max(200),
    address: z.string().optional(),
    city: z.string().min(2).max(100),
    country: z.string().min(2).max(100),
    startDate: z.coerce.date().refine((d) => d > new Date(), { message: 'Start date must be in the future' }),
    endDate: z.coerce.date(),
    capacity: z.number().int().positive(),
    price: z.number().min(0),
    currency: z.string().length(3).default('NGN'),
    coverImage: z.string().url().optional(),
    tags: z.array(z.string()).max(10).default([]),
    defaultReminderDays: z.array(z.number().int().positive()).max(5).default([1, 7]),
  })
  .refine((d) => d.endDate > d.startDate, { message: 'End date must be after start date', path: ['endDate'] });

export const UpdateEventSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  venue: z.string().min(2).max(200).optional(),
  address: z.string().optional(),
  city: z.string().min(2).max(100).optional(),
  country: z.string().min(2).max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  capacity: z.number().int().positive().optional(),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  coverImage: z.string().url().optional(),
  tags: z.array(z.string()).max(10).optional(),
  status: z.nativeEnum(EventStatus).optional(),
});

export const QueryEventsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(EventStatus).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
});

export type CreateEventDto = z.infer<typeof CreateEventSchema>;
export type UpdateEventDto = z.infer<typeof UpdateEventSchema>;
export type QueryEventsDto = z.infer<typeof QueryEventsSchema>;
