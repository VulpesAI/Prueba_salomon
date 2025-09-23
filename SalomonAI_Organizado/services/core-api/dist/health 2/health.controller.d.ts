import { ConfigService } from '@nestjs/config';
import { Connection } from 'typeorm';
export declare class HealthController {
    private readonly configService;
    private readonly connection;
    constructor(configService: ConfigService, connection: Connection);
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
        environment: any;
        version: string;
        services: {
            database: string;
            qdrant: string;
        };
    }>;
    getReadiness(): Promise<{
        status: string;
        timestamp: string;
    }>;
    getLiveness(): {
        status: string;
        timestamp: string;
    };
    private checkDatabase;
}
