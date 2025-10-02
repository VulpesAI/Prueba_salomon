import { Connection } from 'typeorm';
export declare class HealthController {
    private readonly connection?;
    constructor(connection?: Connection);
    getHealth(): {
        ok: boolean;
    };
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
