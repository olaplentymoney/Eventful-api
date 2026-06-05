import { Request, Response, NextFunction } from 'express';
import { notificationsService } from '../services/notifications.service';
import { SetReminderSchema } from '../dto/notifications.dto';
import { AuthenticatedRequest } from '../../../shared/types';
import { successResponse, createdResponse, noContentResponse } from '../../../shared/interceptors/response-transform.interceptor';
import { BadRequestException } from '../../../shared/filters/http-exception';

export class NotificationsController {
  async setReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const result = SetReminderSchema.safeParse(req.body);
      if (!result.success) throw new BadRequestException('Validation failed', result.error.errors.map((e: { message: string }) => e.message));
      const reminder = await notificationsService.setReminder(user.sub, result.data);
      createdResponse(res, reminder, 'Reminder set successfully');
    } catch (err) { next(err); }
  }

  async getMyReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const reminders = await notificationsService.getMyReminders(user.sub, req.query.eventId as string | undefined);
      successResponse(res, reminders);
    } catch (err) { next(err); }
  }

  async deleteReminder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      await notificationsService.deleteReminder(req.params.id, user.sub);
      noContentResponse(res);
    } catch (err) { next(err); }
  }
}

export const notificationsController = new NotificationsController();
