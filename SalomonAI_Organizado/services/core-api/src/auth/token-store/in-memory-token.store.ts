import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StoredRefreshToken, TokenStore, TokenUser } from './token-store.interface';

interface MemoryTokenEntry extends StoredRefreshToken {}

@Injectable()
export class InMemoryTokenStore implements TokenStore {
  private readonly tokens = new Map<string, MemoryTokenEntry>();

  async createRefreshToken(user: TokenUser, refreshTokenHash: string, expiresAt: Date): Promise<{ id: string }> {
    const id = randomUUID();
    this.tokens.set(id, {
      id,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles ?? ['user'],
        uid: user.uid,
      },
      refreshTokenHash,
      expiresAt,
      revokedAt: null,
      rotatedAt: null,
    });
    return { id };
  }

  async findRefreshTokenById(id: string): Promise<StoredRefreshToken | null> {
    const entry = this.tokens.get(id);
    if (!entry) {
      return null;
    }
    return { ...entry, user: { ...entry.user } };
  }

  async markRotated(id: string, rotatedAt: Date): Promise<void> {
    const entry = this.tokens.get(id);
    if (!entry) {
      return;
    }
    this.tokens.set(id, { ...entry, rotatedAt });
  }

  async revokeTokensForUser(userId: string): Promise<void> {
    for (const [key, value] of this.tokens.entries()) {
      if (value.user.id === userId) {
        this.tokens.set(key, { ...value, revokedAt: new Date() });
      }
    }
  }
}
