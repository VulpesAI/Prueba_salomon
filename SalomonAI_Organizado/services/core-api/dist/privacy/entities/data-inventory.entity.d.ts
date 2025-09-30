export declare enum DataInventoryStatus {
    ACTIVE = "active",
    ANONYMIZED = "anonymized",
    PURGED = "purged"
}
export declare class DataInventory {
    id: string;
    dataSubjectId: string;
    dataCategory: string;
    sourceSystem?: string | null;
    collectedAt: Date;
    retentionPeriodDays: number;
    metadata?: Record<string, any> | null;
    status: DataInventoryStatus;
    anonymizedAt?: Date | null;
    purgedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
