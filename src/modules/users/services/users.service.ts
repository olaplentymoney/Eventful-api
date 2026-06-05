import { User } from '@prisma/client';
import { prisma } from '../../../config/database';
import { cacheService } from '../../../shared/cache/cache.service';
import { CacheKeys } from '../../../shared/cache/cache-keys';
import { NotFoundException } from '../../../shared/filters/http-exception';
import { UpdateUserDto } from '../dto/update-user.dto';

export class UsersService {
  async findById(id: string): Promise<Omit<User, 'passwordHash' | 'refreshToken'>> {
    return cacheService.getOrSet(CacheKeys.USER(id), async () => {
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) throw new NotFoundException('User not found');
      const { passwordHash, refreshToken, ...safe } = user;
      return safe;
    }, 300);
  }

  async update(id: string, dto: UpdateUserDto): Promise<Omit<User, 'passwordHash' | 'refreshToken'>> {
    const user = await prisma.user.update({ where: { id }, data: dto });
    await cacheService.del(CacheKeys.USER(id));
    const { passwordHash, refreshToken, ...safe } = user;
    return safe;
  }

  async delete(id: string): Promise<void> {
    await prisma.user.findUniqueOrThrow({ where: { id } }).catch(() => { throw new NotFoundException('User not found'); });
    await prisma.user.delete({ where: { id } });
    await cacheService.del(CacheKeys.USER(id));
  }
}

export const usersService = new UsersService();
