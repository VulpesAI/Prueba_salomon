export declare enum ClassificationLabelSource {
    USER_CORRECTION = "USER_CORRECTION",
    MANUAL_TRAINING = "MANUAL_TRAINING",
    SYSTEM_IMPORT = "SYSTEM_IMPORT"
}
export declare enum ClassificationLabelStatus {
    PENDING = "PENDING",
    QUEUED = "QUEUED",
    USED = "USED"
}
export declare class ClassificationLabel {
    id: string;
    description: string;
    finalCategory: string;
    previousCategory?: string;
    movementId?: string;
    notes?: string;
    metadata?: Record<string, any>;
    source: ClassificationLabelSource;
    status: ClassificationLabelStatus;
    submittedBy?: string;
    createdAt: Date;
    updatedAt: Date;
    acceptedAt?: Date;
}
