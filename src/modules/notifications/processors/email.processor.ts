import { Worker, Job } from 'bullmq';
import { queueConnection } from '../../../config/queue';
import { emailService, ReminderEmailPayload, TicketConfirmationPayload } from '../services/email.service';
import { logger } from '../../../config/logger';

export function startEmailProcessor(): Worker {
  const worker = new Worker(
    'emails',
    async (job: Job) => {
      logger.info('Processing email job', { jobName: job.name, jobId: job.id });

      switch (job.name) {
        case 'reminder-email':
          await emailService.sendReminderEmail(job.data as ReminderEmailPayload);
          break;
        case 'ticket-confirmation':
          await emailService.sendTicketConfirmation(job.data as TicketConfirmationPayload);
          break;
        default:
          logger.warn('Unknown email job type', { jobName: job.name });
      }
    },
    {
      connection: queueConnection,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    logger.info('Email job completed', { jobId: job.id, jobName: job.name });
  });

  worker.on('failed', (job, err) => {
    logger.error('Email job failed', { jobId: job?.id, jobName: job?.name, error: err.message });
  });

  return worker;
}
