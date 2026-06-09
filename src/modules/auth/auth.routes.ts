import { Router } from 'express';
import { authController } from './controllers/auth.controller';
import { authenticate } from '../../shared/guards/jwt-auth.guard';
import { authRateLimiter } from '../../shared/middleware/rate-limiter.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and authorization
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, role]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Ada Okafor
 *               email:
 *                 type: string
 *                 example: ada@eventful.com
 *               password:
 *                 type: string
 *                 example: Creator@123
 *               role:
 *                 type: string
 *                 enum: [CREATOR, EVENTEE]
 *                 example: CREATOR
 *     responses:
 *       201:
 *         description: Registration successful
 *       409:
 *         description: Email already in use
 */
router.post('/register', authRateLimiter, authController.register.bind(authController));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: ada@eventful.com
 *               password:
 *                 type: string
 *                 example: Creator@123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authRateLimiter, authController.login.bind(authController));

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tokens refreshed
 */
router.post('/refresh', authRateLimiter, authController.refresh.bind(authController));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout current session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       204:
 *         description: Logged out successfully
 */
router.post('/logout', authenticate, authController.logout.bind(authController));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     responses:
 *       200:
 *         description: Current user profile
 */
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
