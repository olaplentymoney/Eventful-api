import { Router } from 'express';
import { authController } from './controllers/auth.controller';
import { authenticate } from '../../shared/guards/jwt-auth.guard';
import { authRateLimiter } from '../../shared/middleware/rate-limiter.middleware';

const router = Router();

router.post('/register', authRateLimiter, authController.register.bind(authController));
router.post('/login', authRateLimiter, authController.login.bind(authController));
router.post('/refresh', authRateLimiter, authController.refresh.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
