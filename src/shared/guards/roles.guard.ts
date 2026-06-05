import { UserRole } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ForbiddenException } from '../filters/http-exception';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(new ForbiddenException('Authentication required'));
    }

    if (!roles.includes(user.role)) {
      return next(
        new ForbiddenException(
          `This action requires one of the following roles: ${roles.join(', ')}`,
        ),
      );
    }

    next();
  };
}

export const requireCreator = requireRole(UserRole.CREATOR);
export const requireEventee = requireRole(UserRole.EVENTEE);
export const requireAny = requireRole(UserRole.CREATOR, UserRole.EVENTEE);
