import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { prisma } from '../../../src/config/database';
import { cacheService } from '../../../src/shared/cache/cache.service';
import { makeUser } from '../../helpers/factories';
import {
  ConflictException,
  UnauthorizedException,
} from '../../../src/shared/filters/http-exception';
import { UserRole } from '@prisma/client';

jest.mock('../../../src/config/database', () => ({
  prisma: { user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() } },
}));
jest.mock('../../../src/shared/cache/cache.service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    getOrSet: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCache = cacheService as jest.Mocked<typeof cacheService>;

describe('AuthService', () => {
  let authService: AuthService;
  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test@1234',
      role: UserRole.EVENTEE,
    };

    it('creates a new user and returns tokens', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const mockUser = makeUser({ id: 'new-user-id', email: dto.email, name: dto.name });
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await authService.register(dto);
      expect(result.user.email).toBe(dto.email);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('throws ConflictException if email already exists', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser());
      await expect(authService.register(dto)).rejects.toThrow(ConflictException);
    });

    it('hashes the password before saving', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const mockUser = makeUser();
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await authService.register(dto);
      const createCall = (mockPrisma.user.create as jest.Mock).mock.calls[0][0];
      const isHashed = await bcrypt.compare(dto.password, createCall.data.passwordHash);
      expect(isHashed).toBe(true);
    });
  });

  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'Test@1234' };

    it('returns tokens on valid credentials', async () => {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      const mockUser = makeUser({ passwordHash });
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(mockUser);
      mockCache.del.mockResolvedValue(undefined);

      const result = await authService.login(dto);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.user.email).toBe(dto.email);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const passwordHash = await bcrypt.hash('different-password', 10);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(makeUser({ passwordHash }));
      await expect(authService.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for unknown email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(authService.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('throws UnauthorizedException for blocklisted token', async () => {
      mockCache.exists.mockResolvedValue(true);
      await expect(authService.refreshTokens('any-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for invalid JWT', async () => {
      mockCache.exists.mockResolvedValue(false);
      await expect(authService.refreshTokens('invalid.jwt.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('issues new tokens and rotates refresh token for valid input', async () => {
      const user = makeUser();
      const validToken = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' },
      );

      mockCache.exists.mockResolvedValue(false);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...user,
        refreshToken: validToken,
      });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue(user);
      mockCache.set.mockResolvedValue(undefined);

      const tokens = await authService.refreshTokens(validToken);
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });
  });
});
