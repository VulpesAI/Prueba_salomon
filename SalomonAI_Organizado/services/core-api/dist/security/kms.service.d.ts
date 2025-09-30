import { ConfigService } from '@nestjs/config';
export declare class KmsService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    private decrypt;
    getSecret(secretName: string): Promise<string | undefined>;
}
