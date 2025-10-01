import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User } from './entities/user.entity';
import { FirebaseUserPayload } from './interfaces/user-directory.interface';
import { OAuthUpsertParams } from './interfaces/user-accounts.interface';

export type StoredUser = Omit<User, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
  passwordHash?: string | null;
  mfaSecret?: string | null;
  mfaTempSecret?: string | null;
  mfaBackupCodes?: string[] | null;
};

const buildDefaultPreferences = () => ({
  currency: 'CLP',
  timezone: 'America/Santiago',
  language: 'es',
  notifications: {
    email: true,
    push: true,
    sms: false,
  },
  privacy: {
    shareData: false,
    analytics: true,
  },
});

@Injectable()
export class InMemoryUserStore {
  private readonly users = new Map<string, StoredUser>();

  private clone(user: StoredUser): StoredUser {
    return {
      ...user,
      metadata: user.metadata ? { ...user.metadata } : undefined,
      roles: user.roles ? [...user.roles] : undefined,
      preferences: user.preferences ? JSON.parse(JSON.stringify(user.preferences)) : undefined,
      oauthProviders: user.oauthProviders ? user.oauthProviders.map((provider) => ({ ...provider })) : undefined,
      mfaBackupCodes: user.mfaBackupCodes ? [...user.mfaBackupCodes] : undefined,
    };
  }

  list(): StoredUser[] {
    return Array.from(this.users.values()).map((user) => this.clone(user));
  }

  findById(id: string): StoredUser | null {
    const user = this.users.get(id);
    return user ? this.clone(user) : null;
  }

  findByEmail(email: string): StoredUser | null {
    const user = Array.from(this.users.values()).find((item) => item.email === email);
    return user ? this.clone(user) : null;
  }

  findByUid(uid: string): StoredUser | null {
    const user = Array.from(this.users.values()).find((item) => item.uid === uid);
    return user ? this.clone(user) : null;
  }

  save(user: StoredUser): StoredUser {
    const now = new Date();
    const existing = this.users.get(user.id);
    const stored: StoredUser = {
      ...user,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.users.set(stored.id, stored);
    return this.clone(stored);
  }

  createFromFirebase(payload: FirebaseUserPayload): StoredUser {
    const existing = this.findByUid(payload.uid) ?? (payload.email ? this.findByEmail(payload.email) : null);

    const defaults = {
      displayName: payload.displayName,
      photoURL: payload.photoURL,
      emailVerified: payload.emailVerified ?? false,
      phoneNumber: payload.phoneNumber,
      metadata: payload.metadata ? { ...payload.metadata } : undefined,
      fullName: payload.displayName,
      roles: ['user'],
      isActive: true,
      preferences: buildDefaultPreferences(),
    } satisfies Partial<StoredUser>;

    if (existing) {
      const merged: StoredUser = {
        ...existing,
        ...defaults,
        uid: payload.uid,
        email: payload.email,
      };
      return this.save(merged);
    }

    const created: StoredUser = {
      id: randomUUID(),
      uid: payload.uid,
      email: payload.email,
      passwordHash: null,
      fullName: payload.displayName,
      displayName: payload.displayName,
      photoURL: payload.photoURL,
      emailVerified: payload.emailVerified ?? false,
      phoneNumber: payload.phoneNumber,
      metadata: payload.metadata ? { ...payload.metadata } : undefined,
      roles: ['user'],
      isActive: true,
      mfaEnabled: false,
      preferences: buildDefaultPreferences(),
      profile: undefined,
      movements: [],
      classificationRules: [],
      notifications: [],
      transactions: [],
      goals: [],
      authTokens: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return this.save(created);
  }

  syncWithFirebase(payload: FirebaseUserPayload): StoredUser {
    const user = this.createFromFirebase(payload);
    if (payload.metadata?.lastSignInTime) {
      user.metadata = user.metadata ?? {};
      user.metadata.lastSignInTime = payload.metadata.lastSignInTime;
      return this.save(user);
    }
    return user;
  }

  update(id: string, updateData: Partial<StoredUser>): StoredUser {
    const user = this.findById(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    return this.save({ ...user, ...updateData });
  }

  updateLastSignIn(uid: string, lastSignInTime: string): void {
    const user = this.findByUid(uid);
    if (!user) {
      return;
    }
    const metadata = user.metadata ?? {};
    metadata.lastSignInTime = lastSignInTime;
    this.save({ ...user, metadata });
  }

  deactivate(id: string): void {
    const user = this.findById(id);
    if (!user) {
      return;
    }
    this.save({ ...user, isActive: false });
  }

  activate(id: string): void {
    const user = this.findById(id);
    if (!user) {
      return;
    }
    this.save({ ...user, isActive: true });
  }

  upsertOAuthUser(params: OAuthUpsertParams): StoredUser {
    const existing = this.findByEmail(params.email);
    const now = new Date().toISOString();
    if (!existing) {
      return this.save({
        id: randomUUID(),
        uid: null,
        email: params.email,
        passwordHash: null,
        fullName: params.fullName ?? params.displayName ?? params.email,
        displayName: params.displayName ?? params.fullName ?? params.email,
        photoURL: params.picture,
        emailVerified: true,
        phoneNumber: null,
        metadata: {},
        roles: ['user'],
        isActive: true,
        mfaEnabled: false,
        mfaSecret: null,
        mfaTempSecret: null,
        mfaBackupCodes: null,
        preferences: buildDefaultPreferences(),
        profile: undefined,
        movements: [],
        classificationRules: [],
        notifications: [],
        transactions: [],
        goals: [],
        authTokens: [],
        oauthProviders: [
          {
            provider: params.provider,
            subject: params.subject,
            picture: params.picture,
            lastLoginAt: now,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const providers = existing.oauthProviders ? [...existing.oauthProviders] : [];
    const index = providers.findIndex((item) => item.provider === params.provider);
    const providerEntry = {
      provider: params.provider,
      subject: params.subject,
      picture: params.picture,
      lastLoginAt: now,
    };

    if (index >= 0) {
      providers[index] = providerEntry;
    } else {
      providers.push(providerEntry);
    }

    return this.save({
      ...existing,
      oauthProviders: providers,
      fullName: params.fullName ?? existing.fullName,
      displayName: params.displayName ?? existing.displayName ?? existing.fullName,
      photoURL: params.picture ?? existing.photoURL,
      emailVerified: true,
    });
  }

  remove(id: string): void {
    this.users.delete(id);
  }
}
