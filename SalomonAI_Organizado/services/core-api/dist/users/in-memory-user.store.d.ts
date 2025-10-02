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
export declare class InMemoryUserStore {
    private readonly users;
    private clone;
    list(): StoredUser[];
    findById(id: string): StoredUser | null;
    findByEmail(email: string): StoredUser | null;
    findByUid(uid: string): StoredUser | null;
    save(user: StoredUser): StoredUser;
    createFromFirebase(payload: FirebaseUserPayload): StoredUser;
    syncWithFirebase(payload: FirebaseUserPayload): StoredUser;
    update(id: string, updateData: Partial<StoredUser>): StoredUser;
    updateLastSignIn(uid: string, lastSignInTime: string): void;
    deactivate(id: string): void;
    activate(id: string): void;
    upsertOAuthUser(params: OAuthUpsertParams): StoredUser;
    remove(id: string): void;
}
