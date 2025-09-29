import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TwilioSmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async sendSms(to: string, body: string): Promise<boolean> {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      this.logger.warn('Twilio not configured, skipping SMS dispatch.');
      return false;
    }

    if (!to) {
      this.logger.warn('No destination phone number provided for SMS dispatch.');
      return false;
    }

    try {
      const payload = new URLSearchParams({ To: to, From: fromNumber, Body: body });
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        payload,
        {
          auth: {
            username: accountSid,
            password: authToken,
          },
          timeout: 8000,
        },
      );
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Twilio SMS dispatch failed: ${message}`);
      return false;
    }
  }
}
