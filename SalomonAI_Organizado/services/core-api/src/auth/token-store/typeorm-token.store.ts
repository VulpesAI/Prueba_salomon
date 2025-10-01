import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthToken } from '../entities/auth-token.entity';
import { User } from '../../users/entities/user.entity';
import { StoredRefreshToken, TokenStore, TokenUser } from './token-store.interface';

@Injectable()
export class TypeormTokenStore implements TokenStore {
  constructor(
    @InjectRepository(AuthToken)
    private readonly authTokenRepository: Repository<AuthToken>,
  ) {}

  async createRefreshToken(user: TokenUser, refreshTokenHash: string, expiresAt: Date): Promise<{ id: string }> {
    const entity = this.authTokenRepository.create({
      user: { id: user.id } as User,
      refreshTokenHash,
      expiresAt,
    });
    const saved = await this.authTokenRepository.save(entity);
    return { id: saved.id };
  }

  async findRefreshTokenById(id: string): Promise<StoredRefreshToken | null> {
    const token = await this.authTokenRepository
      .createQueryBuilder('token')
      .leftJoinAndSelect('token.user', 'user')
      .addSelect('token.refreshTokenHash')
      .where('token.id = :id', { id })
      .getOne();

    if (!token) {
      return null;
    }

    return {
      id: token.id,
      user: {
        id: token.user.id,
        email: token.user.email,
        roles: token.user.roles,
        uid: token.user.uid,
      },
      refreshTokenHash: token.refreshTokenHash,
      expiresAt: token.expiresAt,
      revokedAt: token.revokedAt,
      rotatedAt: token.rotatedAt,
    };
  }

  async markRotated(id: string, rotatedAt: Date): Promise<void> {
    await this.authTokenRepository.update({ id }, { rotatedAt });
  }

  async revokeTokensForUser(userId: string): Promise<void> {
    await this.authTokenRepository.update({ user: { id: userId } as User }, { revokedAt: new Date() });
  }
}
