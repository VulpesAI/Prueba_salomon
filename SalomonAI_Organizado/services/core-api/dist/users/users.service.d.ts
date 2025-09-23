import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: Repository<User>);
    findByUid(uid: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    createFromFirebase(firebaseUser: {
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
    }): Promise<User>;
    update(id: string, updateData: Partial<User>): Promise<User>;
    updateLastSignIn(uid: string, lastSignInTime: string): Promise<void>;
    syncWithFirebase(firebaseUser: {
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
    }): Promise<User>;
    deactivate(id: string): Promise<void>;
    activate(id: string): Promise<void>;
    findAll(limit?: number, offset?: number): Promise<{
        users: User[];
        total: number;
    }>;
}
