import { ConfigService } from '@nestjs/config';
export declare class TwilioSmsProvider {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    sendSms(to: string, body: string): Promise<boolean>;
}
