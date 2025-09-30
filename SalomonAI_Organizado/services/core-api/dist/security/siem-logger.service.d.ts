import { ConfigService } from '@nestjs/config';
export interface SecurityEvent {
    type: string;
    severity: 'low' | 'medium' | 'high';
    userId?: string;
    metadata?: Record<string, unknown>;
}
export declare class SiemLoggerService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    logSecurityEvent(event: SecurityEvent): Promise<void>;
}
