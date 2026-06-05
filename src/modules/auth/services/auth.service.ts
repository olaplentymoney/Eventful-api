import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../config/database';
import { env } from '../../../config/env';
import { cacheService } from '../../../shared/cache/cache.service';
import { CacheKeys } from '../../../shared/cache/cache-keys';
import { JwtPayload } from '../../../shared/types';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '../../../shared/filters/http-exception';
import { RegisterDto, LoginDto } from '../dto/auth.dto';
import { User } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash' | 'refreshToken'>;
  tokens: AuthTokens;
}

export class AuthService {
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
      },
    });

    const tokens = this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), tokens };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    // Bust user cache to ensure fresh data
    await cacheService.del(CacheKeys.USER(user.id));

    return { user: this.sanitizeUser(user), tokens };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Check blocklist first
    const isBlocklisted = await cacheService.exists(
      CacheKeys.REFRESH_TOKEN_BLOCKLIST(refreshToken),
    );
    if (isBlocklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    // Rotate tokens
    const tokens = this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    // Blocklist old token (7d TTL matches refresh token expiry)
    await cacheService.set(CacheKeys.REFRESH_TOKEN_BLOCKLIST(refreshToken), true, 60 * 60 * 24 * 7);

    return tokens;
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    // Blocklist the refresh token
    await cacheService.set(CacheKeys.REFRESH_TOKEN_BLOCKLIST(refreshToken), true, 60 * 60 * 24 * 7);
    await cacheService.del(CacheKeys.USER(userId));
  }

  async getProfile(userId: string): Promise<Omit<User, 'passwordHash' | 'refreshToken'>> {
    const user = await cacheService.getOrSet(
      CacheKeys.USER(userId),
      () => prisma.user.findUnique({ where: { id: userId } }),
      300,
    );

    if (!user) throw new NotFoundException('User not found');
    return this.sanitizeUser(user);
  }

  private generateTokens(user: User): AuthTokens {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken },
    });
  }

  private sanitizeUser(user: any): Omit<User, 'passwordHash' | 'refreshToken'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _ph, refreshToken: _rt, ...safe } = user;
    return safe;
  }
}

export const authService = new AuthService();
