import request from 'supertest';
import { Application } from 'express';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  prisma: { user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } },
}));
jest.mock('../../src/config/redis', () => ({
  redis: { get: jest.fn(), setex: jest.fn(), del: jest.fn(), exists: jest.fn(), keys: jest.fn().mockResolvedValue([]) },
}));
jest.mock('../../src/config/queue', () => ({
  emailQueue: { add: jest.fn() }, reminderQueue: { add: jest.fn() }, notificationQueue: { add: jest.fn() },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Auth Integration', () => {
  let app: Application;
  beforeAll(() => { app = createApp(); });
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/v1/auth/register', () => {
    it('201 — creates user and returns tokens', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: 'u1', email: 'new@example.com', name: 'New User', passwordHash: '$2b$12$x',
        role: 'EVENTEE', avatarUrl: null, isVerified: false, refreshToken: null,
        createdAt: new Date(), updatedAt: new Date(),
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

      const res = await request(app).post('/api/v1/auth/register')
        .send({ name: 'New User', email: 'new@example.com', password: 'Valid@1234', role: 'EVENTEE' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('409 — duplicate email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });
      const res = await request(app).post('/api/v1/auth/register')
        .send({ name: 'Dup', email: 'taken@example.com', password: 'Valid@1234', role: 'EVENTEE' });
      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('400 — missing required fields', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({ email: 'x@x.com' });
      expect(res.status).toBe(400);
    });

    it('400 — weak password', async () => {
      const res = await request(app).post('/api/v1/auth/register')
        .send({ name: 'User', email: 'test@example.com', password: 'weak', role: 'EVENTEE' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('401 — unknown email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'ghost@x.com', password: 'Any@1234' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('401 — no Authorization header', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('401 — malformed token', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer bad.token');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /health', () => {
    it('200 — ok', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
