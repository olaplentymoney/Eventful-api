import { Router } from 'express';
import { analyticsController } from './controllers/analytics.controller';
import { authenticate } from '../../shared/guards/jwt-auth.guard';
import { requireCreator } from '../../shared/guards/roles.guard';

const router = Router();

router.get('/dashboard', authenticate, requireCreator, analyticsController.creatorDashboard.bind(analyticsController));
router.get('/events/:eventId', authenticate, requireCreator, analyticsController.eventStats.bind(analyticsController));

export default router;
