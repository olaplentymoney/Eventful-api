import { Request, Response, NextFunction } from 'express';
import { usersService } from '../services/users.service';
import { UpdateUserSchema } from '../dto/update-user.dto';
import { AuthenticatedRequest } from '../../../shared/types';
import { successResponse, noContentResponse } from '../../../shared/interceptors/response-transform.interceptor';
import { BadRequestException } from '../../../shared/filters/http-exception';

export class UsersController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.findById(req.params.id);
      successResponse(res, user);
    } catch (err) { next(err); }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      const result = UpdateUserSchema.safeParse(req.body);
      if (!result.success) throw new BadRequestException('Validation failed', result.error.errors.map((e: { message: string }) => e.message));
      const user = await usersService.update(authUser.sub, result.data);
      successResponse(res, user, 'Profile updated');
    } catch (err) { next(err); }
  }

  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUser = (req as AuthenticatedRequest).user;
      await usersService.delete(authUser.sub);
      noContentResponse(res);
    } catch (err) { next(err); }
  }
}

export const usersController = new UsersController();
