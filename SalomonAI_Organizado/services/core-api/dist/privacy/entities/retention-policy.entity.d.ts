export declare enum RetentionPolicyAction {
    ANONYMIZE = "anonymize",
    DELETE = "delete"
}
export declare class RetentionPolicy {
    id: string;
    dataCategory: string;
    retentionPeriodDays: number;
    gracePeriodDays: number;
    action: RetentionPolicyAction;
    legalBasis?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
