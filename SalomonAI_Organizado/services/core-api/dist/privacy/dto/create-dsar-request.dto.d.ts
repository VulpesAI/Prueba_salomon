import { DsarRequestType } from '../entities/dsar-request.entity';
export declare class CreateDsarRequestDto {
    userId?: string;
    type?: DsarRequestType;
    payload?: Record<string, any>;
    requestedBy?: string;
}
