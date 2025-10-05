import { INestApplication, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const DEFAULT_GLOBAL_PREFIX = 'api/v1';

export function setupGlobalPrefix(app: INestApplication, configService: ConfigService): void {
  const prefix = configService.get<string>('app.globalPrefix') ?? DEFAULT_GLOBAL_PREFIX;

  app.setGlobalPrefix(prefix, {
    exclude: [{ path: 'health', method: RequestMethod.ALL }],
  });
}
