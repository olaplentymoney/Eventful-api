import { Router } from 'express';
import { ticketsController } from './controllers/tickets.controller';
import { authenticate } from '../../shared/guards/jwt-auth.guard';
import { requireCreator, requireEventee, requireAny } from '../../shared/guards/roles.guard';

const router = Router();

// Eventee routes
router.post('/purchase', authenticate, requireEventee, ticketsController.purchase.bind(ticketsController));
router.get('/mine', authenticate, requireAny, ticketsController.myTickets.bind(ticketsController));
router.get('/:id', authenticate, requireAny, ticketsController.getTicket.bind(ticketsController));
router.post('/:id/cancel', authenticate, requireEventee, ticketsController.cancel.bind(ticketsController));

// Creator routes
router.get('/event/:eventId', authenticate, requireCreator, ticketsController.eventTickets.bind(ticketsController));
router.post('/verify', authenticate, requireCreator, ticketsController.verify.bind(ticketsController));

export default router;
