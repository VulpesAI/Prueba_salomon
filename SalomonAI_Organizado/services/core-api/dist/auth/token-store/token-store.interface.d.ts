import { User } from '../../users/entities/user.entity';
export interface TokenUser {
    id: string;
    email: string;
    roles?: string[];
    uid?: string;
}
export interface StoredRefreshToken {
    id: string;
    user: Pick<User, 'id' | 'email' | 'roles' | 'uid'>;
    refreshTokenHash: string;
    expiresAt: Date;
    revokedAt?: Date | null;
    rotatedAt?: Date | null;
}
export interface TokenStore {
    createRefreshToken(user: TokenUser, refreshTokenHash: string, expiresAt: Date): Promise<{
        id: string;
    }>;
    findRefreshTokenById(id: string): Promise<StoredRefreshToken | null>;
    markRotated(id: string, rotatedAt: Date): Promise<void>;
    revokeTokensForUser(userId: string): Promise<void>;
}
export declare const TOKEN_STORE: unique symbol;
