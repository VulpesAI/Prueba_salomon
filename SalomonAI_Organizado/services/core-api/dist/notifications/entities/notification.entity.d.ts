import { User } from '../../users/entities/user.entity';
export declare class Notification {
    id: string;
    message: string;
    read: boolean;
    user: User;
    createdAt: Date;
}
