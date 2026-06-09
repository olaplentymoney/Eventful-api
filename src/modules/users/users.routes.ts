import { Router } from 'express';
import { usersController } from './controllers/users.controller';
import { authenticate } from '../../shared/guards/jwt-auth.guard';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get a user profile by ID
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 */
router.get('/:id', usersController.getProfile.bind(usersController));

/**
 * @swagger
 * /users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update my profile
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               avatarUrl: { type: string, format: uri }
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch('/me', authenticate, usersController.updateProfile.bind(usersController));

/**
 * @swagger
 * /users/me:
 *   delete:
 *     tags: [Users]
 *     summary: Delete my account
 *     responses:
 *       204:
 *         description: Account deleted
 */
router.delete('/me', authenticate, usersController.deleteAccount.bind(usersController));

export default router;
