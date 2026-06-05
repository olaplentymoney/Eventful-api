import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { formatEventDate } from '../../../shared/utils/date-helpers';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

function loadTemplate(name: string): HandlebarsTemplateDelegate {
  const templatePath = path.join(__dirname, '..', 'templates', `${name}.hbs`);
  const source = fs.readFileSync(templatePath, 'utf8');
  return Handlebars.compile(source);
}

Handlebars.registerHelper('formatDate', (date: Date) => formatEventDate(new Date(date)));

export interface ReminderEmailPayload {
  to: string; name: string; eventTitle: string; eventDate: Date;
  eventVenue: string; eventCity: string; eventId: string;
  reminderValue: number; reminderUnit: string;
}

export interface TicketConfirmationPayload {
  to: string; name: string; eventTitle: string; eventDate: Date;
  eventVenue: string; eventCity: string; ticketRef: string; qrCodeUrl: string;
}

export class EmailService {
  async sendReminderEmail(payload: ReminderEmailPayload): Promise<void> {
    try {
      const template = loadTemplate('reminder');
      const html = template({
        ...payload,
        appUrl: env.APP_URL,
        reminderLabel: `${payload.reminderValue} ${payload.reminderUnit.toLowerCase()}${payload.reminderValue > 1 ? 's' : ''}`,
      });
      await transporter.sendMail({
        from: env.SMTP_FROM, to: payload.to,
        subject: `Reminder: ${payload.eventTitle} is coming up!`, html,
      });
      logger.info('Reminder email sent', { to: payload.to });
    } catch (err) {
      logger.error('Failed to send reminder email', { to: payload.to, error: err });
      throw err;
    }
  }

  async sendTicketConfirmation(payload: TicketConfirmationPayload): Promise<void> {
    try {
      const template = loadTemplate('ticket-confirmation');
      const html = template({ ...payload, appUrl: env.APP_URL });
      await transporter.sendMail({
        from: env.SMTP_FROM, to: payload.to,
        subject: `Your ticket for ${payload.eventTitle}`, html,
      });
      logger.info('Ticket confirmation sent', { to: payload.to, ticketRef: payload.ticketRef });
    } catch (err) {
      logger.error('Failed to send ticket confirmation', { to: payload.to, error: err });
      throw err;
    }
  }
}

export const emailService = new EmailService();
