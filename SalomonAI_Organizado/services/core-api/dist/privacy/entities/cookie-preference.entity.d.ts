export declare class CookiePreference {
    id: string;
    userId: string;
    preferences: Record<string, boolean>;
    source?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
