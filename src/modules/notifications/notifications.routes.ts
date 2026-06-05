import { Router } from 'express';
import { notificationsController } from './controllers/notifications.controller';
import { authenticate } from '../../shared/guards/jwt-auth.guard';
import { requireAny } from '../../shared/guards/roles.guard';

const router = Router();

router.post('/reminders', authenticate, requireAny, notificationsController.setReminder.bind(notificationsController));
router.get('/reminders', authenticate, requireAny, notificationsController.getMyReminders.bind(notificationsController));
router.delete('/reminders/:id', authenticate, requireAny, notificationsController.deleteReminder.bind(notificationsController));

export default router;
