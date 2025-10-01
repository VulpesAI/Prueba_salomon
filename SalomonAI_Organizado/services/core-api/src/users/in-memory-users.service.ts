import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import {
  FirebaseUserPayload,
  UserDirectoryService,
} from './interfaces/user-directory.interface';
import { InMemoryUserStore } from './in-memory-user.store';

@Injectable()
export class InMemoryUsersService implements UserDirectoryService {
  constructor(private readonly store: InMemoryUserStore) {}

  async findByUid(uid: string): Promise<User | null> {
    return this.store.findByUid(uid);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.store.findByEmail(email);
  }

  async findById(id: string): Promise<User | null> {
    return this.store.findById(id);
  }

  async createFromFirebase(firebaseUser: FirebaseUserPayload): Promise<User> {
    return this.store.createFromFirebase(firebaseUser);
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    return this.store.update(id, updateData);
  }

  async updateLastSignIn(uid: string, lastSignInTime: string): Promise<void> {
    this.store.updateLastSignIn(uid, lastSignInTime);
  }

  async syncWithFirebase(firebaseUser: FirebaseUserPayload): Promise<User> {
    return this.store.syncWithFirebase(firebaseUser);
  }

  async deactivate(id: string): Promise<void> {
    this.store.deactivate(id);
  }

  async activate(id: string): Promise<void> {
    this.store.activate(id);
  }

  async findAll(limit = 100, offset = 0): Promise<{ users: User[]; total: number }> {
    const users = this.store.list();
    const paginated = users.slice(offset, offset + limit);
    return { users: paginated, total: users.length };
  }
}
