import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from '../dto/auth.dto';
import { AuthenticatedRequest } from '../../../shared/types';
import {
  successResponse,
  createdResponse,
  noContentResponse,
} from '../../../shared/interceptors/response-transform.interceptor';
import { BadRequestException } from '../../../shared/filters/http-exception';

export class AuthController {
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
   *             required: [name, email, password]
   *             properties:
   *               name: { type: string }
   *               email: { type: string, format: email }
   *               password: { type: string, minLength: 8 }
   *               role: { type: string, enum: [CREATOR, EVENTEE] }
   *     responses:
   *       201: { description: Registered successfully }
   *       409: { description: Email already in use }
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = RegisterSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestException('Validation failed', result.error.errors.map((e: { message: string }) => e.message));
      }
      const data = await authService.register(result.data);
      createdResponse(res, data, 'Registration successful');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Login
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string }
   *     responses:
   *       200: { description: Login successful }
   *       401: { description: Invalid credentials }
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = LoginSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestException('Validation failed', result.error.errors.map((e: { message: string }) => e.message));
      }
      const data = await authService.login(result.data);
      successResponse(res, data, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Refresh access token
   *     security: []
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = RefreshTokenSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestException('Refresh token is required');
      }
      const tokens = await authService.refreshTokens(result.data.refreshToken);
      successResponse(res, tokens, 'Tokens refreshed');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Logout current session
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const result = RefreshTokenSchema.safeParse(req.body);
      if (!result.success) {
        throw new BadRequestException('Refresh token is required');
      }
      await authService.logout(user.sub, result.data.refreshToken);
      noContentResponse(res);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /auth/me:
   *   get:
   *     tags: [Auth]
   *     summary: Get current user profile
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const profile = await authService.getProfile(user.sub);
      successResponse(res, profile);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
