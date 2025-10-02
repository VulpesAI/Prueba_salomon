import { Repository } from 'typeorm';
import { AuthToken } from '../entities/auth-token.entity';
import { StoredRefreshToken, TokenStore, TokenUser } from './token-store.interface';
export declare class TypeormTokenStore implements TokenStore {
    private readonly authTokenRepository;
    constructor(authTokenRepository: Repository<AuthToken>);
    createRefreshToken(user: TokenUser, refreshTokenHash: string, expiresAt: Date): Promise<{
        id: string;
    }>;
    findRefreshTokenById(id: string): Promise<StoredRefreshToken | null>;
    markRotated(id: string, rotatedAt: Date): Promise<void>;
    revokeTokensForUser(userId: string): Promise<void>;
}
