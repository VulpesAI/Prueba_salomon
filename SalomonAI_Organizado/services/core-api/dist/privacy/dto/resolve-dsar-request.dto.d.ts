import { DsarRequestStatus } from '../entities/dsar-request.entity';
export declare class ResolveDsarRequestDto {
    status: DsarRequestStatus;
    resolutionNotes?: string;
    payload?: Record<string, any>;
    completedBy?: string;
}
