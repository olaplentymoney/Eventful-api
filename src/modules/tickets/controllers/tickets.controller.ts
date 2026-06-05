import { Request, Response, NextFunction } from 'express';
import { ticketsService } from '../services/tickets.service';
import { PurchaseTicketSchema, VerifyTicketSchema } from '../dto/tickets.dto';
import { AuthenticatedRequest } from '../../../shared/types';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from '../../../shared/interceptors/response-transform.interceptor';
import { BadRequestException } from '../../../shared/filters/http-exception';

export class TicketsController {
  async purchase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const result = PurchaseTicketSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestException('Validation failed', result.error.errors.map((e: { message: string }) => e.message));
      }
      const ticket = await ticketsService.issueTicket(
        user.sub,
        result.data.eventId,
        result.data.paymentReference,
      );
      createdResponse(res, ticket, 'Ticket issued successfully');
    } catch (err) {
      next(err);
    }
  }

  async myTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { tickets, meta } = await ticketsService.findMyTickets(user.sub, req.query);
      paginatedResponse(res, tickets, meta);
    } catch (err) {
      next(err);
    }
  }

  async getTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const ticket = await ticketsService.findTicketById(req.params.id, user.sub);
      successResponse(res, ticket);
    } catch (err) {
      next(err);
    }
  }

  async eventTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const { tickets, meta } = await ticketsService.findEventTickets(
        req.params.eventId,
        user.sub,
        req.query,
      );
      paginatedResponse(res, tickets, meta);
    } catch (err) {
      next(err);
    }
  }

  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const result = VerifyTicketSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestException('Validation failed', result.error.errors.map((e: { message: string }) => e.message));
      }
      const ticket = await ticketsService.verifyAndScanTicket(result.data, user.sub);
      successResponse(res, ticket, 'Ticket verified and scanned');
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const ticket = await ticketsService.cancelTicket(req.params.id, user.sub);
      successResponse(res, ticket, 'Ticket cancelled');
    } catch (err) {
      next(err);
    }
  }
}

export const ticketsController = new TicketsController();
