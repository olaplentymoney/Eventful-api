import { Router } from 'express';
import { eventsController } from './controllers/events.controller';
import { authenticate } from '../../shared/guards/jwt-auth.guard';
import { requireCreator, requireAny } from '../../shared/guards/roles.guard';

const router = Router();

// Public routes
router.get('/', eventsController.findAll.bind(eventsController));
router.get('/slug/:slug', eventsController.findBySlug.bind(eventsController));
router.get('/:id', eventsController.findById.bind(eventsController));
router.get('/:id/share', eventsController.getShareLinks.bind(eventsController));

// Creator-only routes
router.post('/', authenticate, requireCreator, eventsController.create.bind(eventsController));
router.get('/mine/list', authenticate, requireCreator, eventsController.myEvents.bind(eventsController));
router.patch('/:id', authenticate, requireCreator, eventsController.update.bind(eventsController));
router.delete('/:id', authenticate, requireCreator, eventsController.delete.bind(eventsController));
router.post('/:id/cancel', authenticate, requireCreator, eventsController.cancel.bind(eventsController));

export default router;
