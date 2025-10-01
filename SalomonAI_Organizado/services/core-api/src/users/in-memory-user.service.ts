import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { InMemoryUserStore } from './in-memory-user.store';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserAccountsService } from './interfaces/user-accounts.interface';

@Injectable()
export class InMemoryUserService implements UserAccountsService {
  constructor(private readonly store: InMemoryUserStore) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashed = await bcrypt.hash(createUserDto.password, 10);
    return this.store.save({
      id: randomUUID(),
      uid: null,
      email: createUserDto.email,
      passwordHash: hashed,
      fullName: createUserDto.fullName ?? createUserDto.email,
      displayName: createUserDto.fullName ?? createUserDto.email,
      photoURL: null,
      emailVerified: false,
      phoneNumber: null,
      metadata: {},
      roles: ['user'],
      isActive: true,
      mfaEnabled: false,
      mfaSecret: null,
      mfaTempSecret: null,
      mfaBackupCodes: null,
      preferences: undefined,
      profile: undefined,
      movements: [],
      classificationRules: [],
      notifications: [],
      transactions: [],
      goals: [],
      authTokens: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async findAll(): Promise<User[]> {
    return this.store.list();
  }

  async findOne(id: string): Promise<User> {
    const user = this.store.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.store.findByEmail(email);
  }

  async getByIdWithSecrets(id: string): Promise<User | null> {
    return this.store.findById(id);
  }

  async setMfaTempSecret(userId: string, secret: string): Promise<void> {
    const user = this.store.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    this.store.save({ ...user, mfaTempSecret: secret });
  }

  async activateMfa(userId: string, secret: string, backupCodes: string[]): Promise<void> {
    const user = this.store.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    this.store.save({
      ...user,
      mfaSecret: secret,
      mfaEnabled: true,
      mfaTempSecret: null,
      mfaBackupCodes: backupCodes,
      lastMfaAt: new Date(),
    });
  }

  async updateMfaUsage(userId: string): Promise<void> {
    const user = this.store.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    this.store.save({ ...user, lastMfaAt: new Date() });
  }

  async disableMfa(userId: string): Promise<void> {
    const user = this.store.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    this.store.save({
      ...user,
      mfaEnabled: false,
      mfaSecret: null,
      mfaTempSecret: null,
      mfaBackupCodes: null,
      lastMfaAt: null,
    });
  }

  async consumeBackupCode(userId: string, code: string): Promise<boolean> {
    const user = this.store.findById(userId);
    if (!user?.mfaBackupCodes?.length) {
      return false;
    }

    for (let i = 0; i < user.mfaBackupCodes.length; i++) {
      const storedHash = user.mfaBackupCodes[i];
      if (storedHash && (await bcrypt.compare(code, storedHash))) {
        const updatedCodes = [...user.mfaBackupCodes];
        updatedCodes.splice(i, 1);
        this.store.save({ ...user, mfaBackupCodes: updatedCodes });
        return true;
      }
    }

    return false;
  }

  async upsertOAuthUser(params: {
    email: string;
    fullName?: string;
    displayName?: string;
    picture?: string;
    provider: string;
    subject: string;
  }): Promise<User> {
    return this.store.upsertOAuthUser(params);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = this.store.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return this.store.save({ ...user, ...updateUserDto });
  }

  async remove(id: string): Promise<void> {
    const user = this.store.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    this.store.remove(id);
  }
}
