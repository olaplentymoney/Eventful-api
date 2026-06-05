import { Request, Response, NextFunction } from 'express';
import { paymentsService } from '../services/payments.service';
import { AuthenticatedRequest } from '../../../shared/types';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from '../../../shared/interceptors/response-transform.interceptor';
import { BadRequestException } from '../../../shared/filters/http-exception';
import { z } from 'zod';

const InitiateSchema = z.object({ eventId: z.string().uuid() });

export class PaymentsController {
  async initiate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const result = InitiateSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestException('eventId is required');
      }
      const data = await paymentsService.initiate(user.sub, result.data.eventId);
      createdResponse(res, data, 'Payment initiated');
    } catch (err) {
      next(err);
    }
  }

  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const payment = await paymentsService.verify(req.params.reference, user.sub);
      successResponse(res, payment, 'Payment verified');
    } catch (err) {
      next(err);
    }
  }

  async myPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { payments, meta } = await paymentsService.getMyPayments(user.sub, req.query);
      paginatedResponse(res, payments, meta);
    } catch (err) {
      next(err);
    }
  }

  async eventPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { payments, meta } = await paymentsService.getEventPayments(
        req.params.eventId,
        user.sub,
        req.query,
      );
      paginatedResponse(res, payments, meta);
    } catch (err) {
      next(err);
    }
  }

  async getByReference(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const payment = await paymentsService.getPaymentByReference(req.params.reference, user.sub);
      successResponse(res, payment);
    } catch (err) {
      next(err);
    }
  }
}

export const paymentsController = new PaymentsController();
