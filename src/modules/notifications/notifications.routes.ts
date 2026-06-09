import { Router } from 'express';
import { notificationsController } from './controllers/notifications.controller';
import { authenticate } from '../../shared/guards/jwt-auth.guard';
import { requireAny } from '../../shared/guards/roles.guard';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Event reminders and notifications
 */

/**
 * @swagger
 * /notifications/reminders:
 *   post:
 *     tags: [Notifications]
 *     summary: Set a reminder for an event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, value, unit]
 *             properties:
 *               eventId:
 *                 type: string
 *                 format: uuid
 *               value:
 *                 type: integer
 *                 example: 1
 *               unit:
 *                 type: string
 *                 enum: [MINUTES, HOURS, DAYS, WEEKS]
 *                 example: DAYS
 *               channel:
 *                 type: string
 *                 enum: [EMAIL, PUSH, BOTH]
 *                 default: EMAIL
 *     responses:
 *       201:
 *         description: Reminder scheduled
 *       409:
 *         description: Reminder already set for this interval
 */
router.post('/reminders', authenticate, requireAny, notificationsController.setReminder.bind(notificationsController));

/**
 * @swagger
 * /notifications/reminders:
 *   get:
 *     tags: [Notifications]
 *     summary: List my reminders
 *     parameters:
 *       - in: query
 *         name: eventId
 *         schema: { type: string, format: uuid }
 *         description: Filter by event ID
 *     responses:
 *       200:
 *         description: List of reminders
 */
router.get('/reminders', authenticate, requireAny, notificationsController.getMyReminders.bind(notificationsController));

/**
 * @swagger
 * /notifications/reminders/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete a reminder
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Reminder deleted
 *       404:
 *         description: Reminder not found
 */
router.delete('/reminders/:id', authenticate, requireAny, notificationsController.deleteReminder.bind(notificationsController));

export default router;
