import { Router } from 'express';
import { ticketsController } from './controllers/tickets.controller';
import { authenticate } from '../../shared/guards/jwt-auth.guard';
import { requireCreator, requireEventee, requireAny } from '../../shared/guards/roles.guard';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Tickets
 *   description: Ticket purchase, management and QR verification
 */

/**
 * @swagger
 * /tickets/purchase:
 *   post:
 *     tags: [Tickets]
 *     summary: Issue a ticket after successful payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, paymentReference]
 *             properties:
 *               eventId:
 *                 type: string
 *                 format: uuid
 *               paymentReference:
 *                 type: string
 *                 example: EVT-6C44B76C76AB4E84
 *     responses:
 *       201:
 *         description: Ticket issued with QR code
 *       400:
 *         description: Payment not completed or event sold out
 *       409:
 *         description: Ticket already issued
 */
router.post('/purchase', authenticate, requireEventee, ticketsController.purchase.bind(ticketsController));

/**
 * @swagger
 * /tickets/mine:
 *   get:
 *     tags: [Tickets]
 *     summary: List my tickets
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of tickets
 */
router.get('/mine', authenticate, requireAny, ticketsController.myTickets.bind(ticketsController));

/**
 * @swagger
 * /tickets/verify:
 *   post:
 *     tags: [Tickets]
 *     summary: Scan and verify a QR code at the event entrance
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [qrToken]
 *             properties:
 *               qrToken:
 *                 type: string
 *                 description: The qrCodeData value from the ticket
 *               scannedBy:
 *                 type: string
 *                 example: Ada Okafor
 *     responses:
 *       200:
 *         description: Ticket verified and marked as USED
 *       400:
 *         description: Invalid or tampered QR code
 *       409:
 *         description: Ticket already scanned
 */
router.post('/verify', authenticate, requireCreator, ticketsController.verify.bind(ticketsController));

/**
 * @swagger
 * /tickets/event/{eventId}:
 *   get:
 *     tags: [Tickets]
 *     summary: List all tickets for a specific event
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated list of event tickets
 *       403:
 *         description: Forbidden - Creator only
 */
router.get('/event/:eventId', authenticate, requireCreator, ticketsController.eventTickets.bind(ticketsController));

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     tags: [Tickets]
 *     summary: Get a ticket by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Ticket details with QR code
 *       404:
 *         description: Ticket not found
 */
router.get('/:id', authenticate, requireAny, ticketsController.getTicket.bind(ticketsController));

/**
 * @swagger
 * /tickets/{id}/cancel:
 *   post:
 *     tags: [Tickets]
 *     summary: Cancel a ticket
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Ticket cancelled
 *       400:
 *         description: Cannot cancel a used ticket
 */
router.post('/:id/cancel', authenticate, requireEventee, ticketsController.cancel.bind(ticketsController));

export default router;
