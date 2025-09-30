export declare enum DsarRequestType {
    ACCESS = "access",
    RECTIFICATION = "rectification",
    ERASURE = "erasure"
}
export declare enum DsarRequestStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    REJECTED = "rejected"
}
export declare class DsarRequest {
    id: string;
    userId: string;
    type: DsarRequestType;
    status: DsarRequestStatus;
    payload?: Record<string, any> | null;
    resolutionNotes?: string | null;
    requestedBy?: string | null;
    completedBy?: string | null;
    requestedAt: Date;
    completedAt?: Date | null;
    updatedAt: Date;
}
