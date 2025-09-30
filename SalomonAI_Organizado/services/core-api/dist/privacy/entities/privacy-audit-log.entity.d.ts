export declare class PrivacyAuditLog {
    id: string;
    action: string;
    actor: string;
    actorRole: string;
    details?: Record<string, any> | null;
    createdAt: Date;
}
