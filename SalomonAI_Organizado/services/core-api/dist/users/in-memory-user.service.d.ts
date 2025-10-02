import { InMemoryUserStore } from './in-memory-user.store';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UserAccountsService } from './interfaces/user-accounts.interface';
export declare class InMemoryUserService implements UserAccountsService {
    private readonly store;
    constructor(store: InMemoryUserStore);
    create(createUserDto: CreateUserDto): Promise<User>;
    findAll(): Promise<User[]>;
    findOne(id: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    getByIdWithSecrets(id: string): Promise<User | null>;
    setMfaTempSecret(userId: string, secret: string): Promise<void>;
    activateMfa(userId: string, secret: string, backupCodes: string[]): Promise<void>;
    updateMfaUsage(userId: string): Promise<void>;
    disableMfa(userId: string): Promise<void>;
    consumeBackupCode(userId: string, code: string): Promise<boolean>;
    upsertOAuthUser(params: {
        email: string;
        fullName?: string;
        displayName?: string;
        picture?: string;
        provider: string;
        subject: string;
    }): Promise<User>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<User>;
    remove(id: string): Promise<void>;
}
