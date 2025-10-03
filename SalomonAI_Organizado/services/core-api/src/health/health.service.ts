import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getHealthStatus() {
    const version = this.configService.get<string>('app.version') ?? '0.0.0';
    const environment = this.configService.get<string>('app.environment');
    const profile = this.configService.get<string>('app.profile');

    return {
      status: 'ok',
      environment,
      profile,
      version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}
