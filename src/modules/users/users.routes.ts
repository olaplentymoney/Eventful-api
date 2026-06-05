import { Router } from 'express';
import { usersController } from './controllers/users.controller';
import { authenticate } from '../../shared/guards/jwt-auth.guard';

const router = Router();

router.get('/:id', usersController.getProfile.bind(usersController));
router.patch('/me', authenticate, usersController.updateProfile.bind(usersController));
router.delete('/me', authenticate, usersController.deleteAccount.bind(usersController));

export default router;
