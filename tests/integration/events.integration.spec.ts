import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Application } from 'express';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { makeEvent } from '../helpers/factories';

jest.mock('../../src/config/database', () => ({
  prisma: {
    event: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    ticket: { count: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('../../src/config/redis', () => ({
  redis: { get: jest.fn(), setex: jest.fn(), del: jest.fn(), exists: jest.fn(), keys: jest.fn().mockResolvedValue([]) },
}));
jest.mock('../../src/config/queue', () => ({
  emailQueue: { add: jest.fn() }, reminderQueue: { add: jest.fn() }, notificationQueue: { add: jest.fn() },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeCreatorToken(): string {
  return jwt.sign(
    { sub: 'creator-id-1', email: 'creator@test.com', role: 'CREATOR' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

function makeEventeeToken(): string {
  return jwt.sign(
    { sub: 'user-id-1', email: 'user@test.com', role: 'EVENTEE' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

describe('Events Integration', () => {
  let app: Application;
  beforeAll(() => { app = createApp(); });
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/v1/events', () => {
    it('200 — returns paginated public events', async () => {
      const events = [makeEvent(), makeEvent({ id: 'event-id-2' })];
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([events, 2]);

      const res = await request(app).get('/api/v1/events');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.meta).toBeDefined();
    });
  });

  describe('POST /api/v1/events', () => {
    const validPayload = {
      title: 'Jazz Night Lagos',
      description: 'A wonderful jazz evening in the heart of Lagos city.',
      venue: 'Eko Hotel',
      city: 'Lagos',
      country: 'Nigeria',
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
      capacity: 300,
      price: 10000,
    };

    it('401 — no token', async () => {
      const res = await request(app).post('/api/v1/events').send(validPayload);
      expect(res.status).toBe(401);
    });

    it('403 — eventee cannot create events', async () => {
      const res = await request(app).post('/api/v1/events')
        .set('Authorization', `Bearer ${makeEventeeToken()}`).send(validPayload);
      expect(res.status).toBe(403);
    });

    it('201 — creator can create an event', async () => {
      const event = makeEvent({ title: validPayload.title, creatorId: 'creator-id-1' });
      (mockPrisma.event.create as jest.Mock).mockResolvedValue(event);

      const res = await request(app).post('/api/v1/events')
        .set('Authorization', `Bearer ${makeCreatorToken()}`).send(validPayload);
      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe(event.title);
    });
  });

  describe('GET /api/v1/events/:id', () => {
    it('200 — returns event by id', async () => {
      const event = makeEvent();
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(event);

      const res = await request(app).get(`/api/v1/events/${event.id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(event.id);
    });

    it('404 — unknown event id', async () => {
      (mockPrisma.event.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await request(app).get('/api/v1/events/does-not-exist');
      expect(res.status).toBe(404);
    });
  });
});
