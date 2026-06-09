import { Router } from 'express';
import { analyticsController } from './controllers/analytics.controller';
import { authenticate } from '../../shared/guards/jwt-auth.guard';
import { requireCreator } from '../../shared/guards/roles.guard';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Creator analytics and dashboards
 */

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     tags: [Analytics]
 *     summary: Get creator dashboard — total events, revenue, tickets sold, scan rate
 *     responses:
 *       200:
 *         description: Creator analytics summary
 *       403:
 *         description: Forbidden - Creator only
 */
router.get('/dashboard', authenticate, requireCreator, analyticsController.creatorDashboard.bind(analyticsController));

/**
 * @swagger
 * /analytics/events/{eventId}:
 *   get:
 *     tags: [Analytics]
 *     summary: Get per-event analytics — tickets sold, scanned, revenue, occupancy rate
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Event analytics
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event not found
 */
router.get('/events/:eventId', authenticate, requireCreator, analyticsController.eventStats.bind(analyticsController));

export default router;
