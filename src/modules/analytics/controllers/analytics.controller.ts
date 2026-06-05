import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { AuthenticatedRequest } from '../../../shared/types';
import { successResponse } from '../../../shared/interceptors/response-transform.interceptor';

export class AnalyticsController {
  async creatorDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const analytics = await analyticsService.getCreatorAnalytics(user.sub);
      successResponse(res, analytics);
    } catch (err) { next(err); }
  }

  async eventStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const analytics = await analyticsService.getEventAnalytics(req.params.eventId, user.sub);
      successResponse(res, analytics);
    } catch (err) { next(err); }
  }
}

export const analyticsController = new AnalyticsController();
