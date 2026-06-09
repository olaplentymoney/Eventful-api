import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Eventful API',
      version: '1.0.0',
      description:
        'Eventful — your passport to unforgettable moments.\n\n' +
        '## How to use\n' +
        '1. Register using `POST /auth/register` with role `CREATOR` or `EVENTEE`\n' +
        '2. Login using `POST /auth/login` to get your `accessToken`\n' +
        '3. Click the **Authorize** button and enter: `Bearer YOUR_ACCESS_TOKEN`\n' +
        '4. All protected endpoints will now work automatically\n\n' +
        '## Roles\n' +
        '- **CREATOR** — create events, view tickets, scan QR codes, view analytics\n' +
        '- **EVENTEE** — browse events, purchase tickets, set reminders',
      contact: { name: 'Eventful Team', email: 'support@eventful.com' },
    },
    servers: [
      { url: `${env.APP_URL}${env.API_PREFIX}`, description: 'Current server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token: Bearer <token>',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object' } },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    './src/modules/**/*.routes.ts',
    './dist/modules/**/*.routes.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
