import { Queue, QueueOptions } from 'bullmq';
import { env } from './env';

export const queueConnection = {
  host: env.BULL_REDIS_HOST,
  port: env.BULL_REDIS_PORT,
};

const defaultQueueOptions: QueueOptions = {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
};

export const emailQueue = new Queue('emails', defaultQueueOptions);
export const reminderQueue = new Queue('reminders', defaultQueueOptions);
export const notificationQueue = new Queue('notifications', defaultQueueOptions);

export type QueueName = 'emails' | 'reminders' | 'notifications';
