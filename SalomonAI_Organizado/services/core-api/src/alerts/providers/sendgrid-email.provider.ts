import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SendGridEmailProvider {
  private readonly logger = new Logger(SendGridEmailProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async sendEmail(to: string, subject: string, content: string): Promise<boolean> {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    const sender = this.configService.get<string>('SENDGRID_SENDER_EMAIL');

    if (!apiKey || !sender) {
      this.logger.warn('SendGrid not configured, skipping email dispatch.');
      return false;
    }

    try {
      await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [
            {
              to: [{ email: to }],
            },
          ],
          from: { email: sender },
          subject,
          content: [
            {
              type: 'text/plain',
              value: content,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        },
      );

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SendGrid email dispatch failed: ${message}`);
      return false;
    }
  }
}
