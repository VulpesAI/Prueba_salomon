import { User } from '../entities/user.entity';

export interface FirebaseUserPayload {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  phoneNumber?: string;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

export interface UserDirectoryService {
  findByUid(uid: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  createFromFirebase(firebaseUser: FirebaseUserPayload): Promise<User>;
  update(id: string, updateData: Partial<User>): Promise<User>;
  updateLastSignIn(uid: string, lastSignInTime: string): Promise<void>;
  syncWithFirebase(firebaseUser: FirebaseUserPayload): Promise<User>;
  deactivate(id: string): Promise<void>;
  activate(id: string): Promise<void>;
  findAll(limit?: number, offset?: number): Promise<{ users: User[]; total: number }>;
}

export const USER_DIRECTORY_SERVICE = Symbol('USER_DIRECTORY_SERVICE');
