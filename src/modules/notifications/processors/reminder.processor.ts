import { Worker, Job } from 'bullmq';
import { queueConnection } from '../../../config/queue';
import { notificationsService } from '../services/notifications.service';
import { logger } from '../../../config/logger';

export function startReminderProcessor(): Worker {
  const worker = new Worker(
    'reminders',
    async (job: Job) => {
      logger.info('Processing reminder job', { jobId: job.id });
      const { reminderId } = job.data as { reminderId: string };
      if (!reminderId) {
        logger.warn('Reminder job missing reminderId', { jobId: job.id });
        return;
      }
      await notificationsService.processReminder(reminderId);
    },
    { connection: queueConnection, concurrency: 10 },
  );

  worker.on('completed', (job) => logger.info('Reminder job completed', { jobId: job.id }));
  worker.on('failed', (job, err) => logger.error('Reminder job failed', { jobId: job?.id, error: err.message }));

  return worker;
}
