import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { FirebaseUserPayload, UserDirectoryService } from './interfaces/user-directory.interface';
export declare class UsersService implements UserDirectoryService {
    private readonly usersRepository;
    constructor(usersRepository: Repository<User>);
    findByUid(uid: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    createFromFirebase(firebaseUser: FirebaseUserPayload): Promise<User>;
    update(id: string, updateData: Partial<User>): Promise<User>;
    updateLastSignIn(uid: string, lastSignInTime: string): Promise<void>;
    syncWithFirebase(firebaseUser: FirebaseUserPayload): Promise<User>;
    deactivate(id: string): Promise<void>;
    activate(id: string): Promise<void>;
    findAll(limit?: number, offset?: number): Promise<{
        users: User[];
        total: number;
    }>;
}
