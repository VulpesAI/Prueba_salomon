import { StoredRefreshToken, TokenStore, TokenUser } from './token-store.interface';
export declare class InMemoryTokenStore implements TokenStore {
    private readonly tokens;
    createRefreshToken(user: TokenUser, refreshTokenHash: string, expiresAt: Date): Promise<{
        id: string;
    }>;
    findRefreshTokenById(id: string): Promise<StoredRefreshToken | null>;
    markRotated(id: string, rotatedAt: Date): Promise<void>;
    revokeTokensForUser(userId: string): Promise<void>;
}
