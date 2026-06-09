import { Router } from 'express';
import { eventsController } from './controllers/events.controller';
import { authenticate } from '../../shared/guards/jwt-auth.guard';
import { requireCreator, requireAny } from '../../shared/guards/roles.guard';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management
 */

/**
 * @swagger
 * /events:
 *   get:
 *     tags: [Events]
 *     summary: List all published events
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: tags
 *         schema: { type: string }
 *         description: Comma-separated tags
 *     responses:
 *       200:
 *         description: Paginated list of events
 */
router.get('/', eventsController.findAll.bind(eventsController));

/**
 * @swagger
 * /events/slug/{slug}:
 *   get:
 *     tags: [Events]
 *     summary: Get event by share slug
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event details
 *       404:
 *         description: Event not found
 */
router.get('/slug/:slug', eventsController.findBySlug.bind(eventsController));

/**
 * @swagger
 * /events/mine/list:
 *   get:
 *     tags: [Events]
 *     summary: List creator's own events
 *     responses:
 *       200:
 *         description: Paginated list of creator events
 */
router.get('/mine/list', authenticate, requireCreator, eventsController.myEvents.bind(eventsController));

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Get event by ID
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Event details
 *       404:
 *         description: Event not found
 */
router.get('/:id', eventsController.findById.bind(eventsController));

/**
 * @swagger
 * /events/{id}/share:
 *   get:
 *     tags: [Events]
 *     summary: Get social share links for an event
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Share links for Twitter, Facebook, WhatsApp, LinkedIn
 */
router.get('/:id/share', eventsController.getShareLinks.bind(eventsController));

/**
 * @swagger
 * /events:
 *   post:
 *     tags: [Events]
 *     summary: Create a new event
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, venue, city, country, startDate, endDate, capacity, price]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Afrobeats Night Lagos
 *               description:
 *                 type: string
 *                 example: The biggest afrobeats night in Lagos this season.
 *               venue:
 *                 type: string
 *                 example: Eko Hotel and Suites
 *               city:
 *                 type: string
 *                 example: Lagos
 *               country:
 *                 type: string
 *                 example: Nigeria
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-15T20:00:00Z"
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-16T02:00:00Z"
 *               capacity:
 *                 type: integer
 *                 example: 500
 *               price:
 *                 type: number
 *                 example: 15000
 *               currency:
 *                 type: string
 *                 example: NGN
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["music", "afrobeats"]
 *     responses:
 *       201:
 *         description: Event created
 *       403:
 *         description: Forbidden - Creator only
 */
router.post('/', authenticate, requireCreator, eventsController.create.bind(eventsController));

/**
 * @swagger
 * /events/{id}:
 *   patch:
 *     tags: [Events]
 *     summary: Update an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, CANCELLED, COMPLETED]
 *               capacity: { type: integer }
 *               price: { type: number }
 *     responses:
 *       200:
 *         description: Event updated
 */
router.patch('/:id', authenticate, requireCreator, eventsController.update.bind(eventsController));

/**
 * @swagger
 * /events/{id}/cancel:
 *   post:
 *     tags: [Events]
 *     summary: Cancel an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Event cancelled
 */
router.post('/:id/cancel', authenticate, requireCreator, eventsController.cancel.bind(eventsController));

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     tags: [Events]
 *     summary: Delete an event
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Event deleted
 */
router.delete('/:id', authenticate, requireCreator, eventsController.delete.bind(eventsController));

export default router;
