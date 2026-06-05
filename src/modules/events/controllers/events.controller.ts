import { Request, Response, NextFunction } from 'express';
import { eventsService } from '../services/events.service';
import { CreateEventSchema, UpdateEventSchema, QueryEventsSchema } from '../dto/events.dto';
import { AuthenticatedRequest } from '../../../shared/types';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
  noContentResponse,
} from '../../../shared/interceptors/response-transform.interceptor';
import { BadRequestException } from '../../../shared/filters/http-exception';

export class EventsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const result = CreateEventSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestException('Validation failed', result.error.errors.map((e: { message: string }) => e.message));
      }
      const event = await eventsService.create(user.sub, result.data);
      createdResponse(res, event, 'Event created successfully');
    } catch (err) {
      next(err);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = QueryEventsSchema.safeParse(req.query);
      if (!result.success) {
        throw new BadRequestException('Invalid query parameters', result.error.errors.map((e: { message: string }) => e.message));
      }
      const { events, meta } = await eventsService.findAll(result.data);
      paginatedResponse(res, events, meta);
    } catch (err) {
      next(err);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await eventsService.findById(req.params.id);
      successResponse(res, event);
    } catch (err) {
      next(err);
    }
  }

  async findBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await eventsService.findBySlug(req.params.slug);
      successResponse(res, event);
    } catch (err) {
      next(err);
    }
  }

  async myEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const result = QueryEventsSchema.safeParse(req.query);
      if (!result.success) {
        throw new BadRequestException('Invalid query parameters');
      }
      const { events, meta } = await eventsService.findByCreator(user.sub, result.data);
      paginatedResponse(res, events, meta);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const result = UpdateEventSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestException('Validation failed', result.error.errors.map((e: { message: string }) => e.message));
      }
      const event = await eventsService.update(req.params.id, user.sub, result.data);
      successResponse(res, event, 'Event updated');
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      await eventsService.delete(req.params.id, user.sub);
      noContentResponse(res);
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const event = await eventsService.cancel(req.params.id, user.sub);
      successResponse(res, event, 'Event cancelled');
    } catch (err) {
      next(err);
    }
  }

  async getShareLinks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await eventsService.findById(req.params.id);
      const links = eventsService.getShareLinks(event);
      successResponse(res, links);
    } catch (err) {
      next(err);
    }
  }
}

export const eventsController = new EventsController();
