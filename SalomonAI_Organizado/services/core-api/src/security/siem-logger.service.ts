import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high';
  userId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SiemLoggerService {
  private readonly logger = new Logger(SiemLoggerService.name);

  constructor(private readonly configService: ConfigService) {}

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const endpoint = this.configService.get<string>('SIEM_ENDPOINT');
    const payload = {
      ...event,
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      service: 'core-api',
    };

    if (!endpoint) {
      this.logger.log(`[${event.severity}] ${event.type} ${JSON.stringify(payload.metadata ?? {})}`);
      return;
    }

    try {
      await axios.post(endpoint, payload, {
        timeout: 4000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.configService.get<string>('SIEM_TOKEN') ?? ''}`,
        },
      });
    } catch (error) {
      this.logger.warn(`No fue posible enviar evento al SIEM: ${error}`);
    }
  }
}

