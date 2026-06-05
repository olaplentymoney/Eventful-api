import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { logger } from './config/logger';
import { globalRateLimiter } from './shared/middleware/rate-limiter.middleware';
import { errorHandler, notFoundHandler } from './shared/filters/http-exception.filter';

import authRoutes from './modules/auth/auth.routes';
import eventRoutes from './modules/events/events.routes';
import ticketRoutes from './modules/tickets/tickets.routes';
import paymentRoutes from './modules/payments/payments.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import userRoutes from './modules/users/users.routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
  app.disable('x-powered-by');

  // Webhook route needs raw body — skip JSON parsing for it
  app.use((req, _res, next) => {
    if (req.originalUrl.includes('/webhook/paystack')) return next();
    express.json({ limit: '2mb' })(req, _res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(compression());

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
  }

  app.use(globalRateLimiter);

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(`${env.API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Eventful API Docs' }));
  app.get(`${env.API_PREFIX}/docs.json`, (_req, res) => res.json(swaggerSpec));

  const p = env.API_PREFIX;
  app.use(`${p}/auth`, authRoutes);
  app.use(`${p}/events`, eventRoutes);
  app.use(`${p}/tickets`, ticketRoutes);
  app.use(`${p}/payments`, paymentRoutes);
  app.use(`${p}/notifications`, notificationRoutes);
  app.use(`${p}/analytics`, analyticsRoutes);
  app.use(`${p}/users`, userRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
