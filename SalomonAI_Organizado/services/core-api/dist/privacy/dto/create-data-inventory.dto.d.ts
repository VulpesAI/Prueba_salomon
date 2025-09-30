export declare class CreateDataInventoryDto {
    dataSubjectId: string;
    dataCategory: string;
    sourceSystem?: string;
    collectedAt: string;
    retentionPeriodDays: number;
    metadata?: Record<string, any>;
    requestedBy?: string;
}
