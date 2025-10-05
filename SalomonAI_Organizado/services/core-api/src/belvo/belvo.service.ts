import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { BelvoConfig } from '../config/configuration';
import { GenerateBelvoLinkTokenDto } from './dto/generate-link-token.dto';
import { TriggerBelvoSyncDto } from './dto/trigger-sync.dto';

export interface BelvoLinkToken {
  institution: string;
  userId: string;
  accessMode: 'single' | 'recurrent';
  expiresAt: string;
  token: string;
}

export interface BelvoSyncResponse {
  linkId: string;
  dataset: 'transactions' | 'accounts' | 'balances';
  scheduledAt: string;
  status: 'queued' | 'running' | 'disabled';
}

@Injectable()
export class BelvoService {
  private readonly logger = new Logger(BelvoService.name);
  private readonly config: BelvoConfig;

  constructor(private readonly configService: ConfigService) {
    this.config =
      this.configService.get<BelvoConfig>('belvo', { infer: true }) ?? ({
        enabled: false,
        timeoutMs: 15000,
      } satisfies BelvoConfig);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getBaseUrl(): string | undefined {
    return this.config.baseUrl;
  }

  getCredentials(): { secretId?: string; secretPassword?: string } {
    if (!this.isEnabled()) {
      return {};
    }

    return {
      secretId: this.config.secretId,
      secretPassword: this.config.secretPassword,
    };
  }

  getWebhookSecret(): string | undefined {
    return this.config.webhookSecret;
  }

  async generateLinkToken(dto: GenerateBelvoLinkTokenDto): Promise<BelvoLinkToken> {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const accessMode = dto.accessMode ?? 'single';

    this.logger.debug(
      `Issuing Belvo link token stub for user=${dto.userId} institution=${dto.institution}`,
    );

    return {
      institution: dto.institution,
      userId: dto.userId,
      accessMode,
      expiresAt,
      token: Buffer.from(`${dto.userId}:${dto.institution}:${expiresAt}`).toString('base64'),
    };
  }

  async triggerSynchronization(linkId: string, dto: TriggerBelvoSyncDto): Promise<BelvoSyncResponse> {
    const scheduledAt = new Date().toISOString();
    const dataset = dto.dataset ?? 'transactions';

    if (!this.isEnabled()) {
      this.logger.warn(
        `Belvo integration is disabled. Sync request ignored for link=${linkId} user=${dto.userId}`,
      );
      return {
        linkId,
        dataset,
        scheduledAt,
        status: 'disabled',
      };
    }

    this.logger.log(
      `Belvo synchronization stub queued for link=${linkId}, dataset=${dataset}, user=${dto.userId}`,
    );

    return {
      linkId,
      dataset,
      scheduledAt,
      status: 'queued',
    };
  }
}
