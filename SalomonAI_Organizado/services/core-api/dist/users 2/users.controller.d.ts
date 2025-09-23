import { UsersService } from './users.service';
import { User } from './entities/user.entity';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getProfile(req: any): Promise<User>;
    updateProfile(req: any, updateData: Partial<User>): Promise<User>;
    deactivateAccount(req: any): Promise<void>;
    findOne(id: string): Promise<User>;
    findAll(limit?: string, offset?: string): Promise<{
        users: User[];
        total: number;
    }>;
    update(id: string, updateData: Partial<User>): Promise<User>;
    activate(id: string): Promise<void>;
    deactivate(id: string): Promise<void>;
}
