import { User } from '../../users/entities/user.entity';
export declare class AuthToken {
    id: string;
    user: User;
    refreshTokenHash: string;
    expiresAt: Date;
    rotatedAt?: Date | null;
    revokedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
