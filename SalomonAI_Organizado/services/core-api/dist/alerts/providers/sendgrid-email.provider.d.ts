import { ConfigService } from '@nestjs/config';
export declare class SendGridEmailProvider {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    sendEmail(to: string, subject: string, content: string): Promise<boolean>;
}
