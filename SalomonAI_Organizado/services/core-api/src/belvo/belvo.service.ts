import {
  HttpException,
  Injectable,
  Logger,
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch, type Response } from 'undici';

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
  status: string;
  taskId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

@Injectable()
export class BelvoService {
  private readonly logger = new Logger(BelvoService.name);
  private readonly config: BelvoConfig;

  constructor(private readonly configService: ConfigService) {
    this.config =
      this.configService.get<BelvoConfig>('belvo', { infer: true }) ??
      ({
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
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('Belvo integration is disabled');
    }

    const accessMode = dto.accessMode ?? 'single';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.resolveTimeout());

    try {
      const response = await fetch(this.buildUrl('/api/token/'), {
        method: 'POST',
        signal: controller.signal,
        headers: this.buildHeaders(),
        body: JSON.stringify({
          id: dto.userId,
          access_mode: accessMode,
          scopes: [
            'read_institutions',
            'write_links',
            'read_links',
            'write_transactions',
            'read_transactions',
          ],
          widget: {
            institution: dto.institution,
          },
        }),
      });

      if (!response.ok) {
        const errorMessage = await this.extractErrorMessage(response);
        throw new HttpException(
          `Belvo token request failed (${response.status}): ${errorMessage}`,
          response.status,
        );
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const token = this.getString(payload.token);
      const expiresAt = this.toIsoString(payload.expires_at) ?? this.computeDefaultExpiry();

      if (!token) {
        throw new ServiceUnavailableException('Belvo token response did not include a token');
      }

      return {
        institution: dto.institution,
        userId: dto.userId,
        accessMode,
        expiresAt,
        token,
      } satisfies BelvoLinkToken;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException('Belvo token request timed out');
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to generate Belvo link token: ${message}`);
      throw new ServiceUnavailableException('Failed to generate Belvo link token');
    } finally {
      clearTimeout(timeout);
    }
  }

  async triggerSynchronization(
    linkId: string,
    dto: TriggerBelvoSyncDto,
  ): Promise<BelvoSyncResponse> {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException('Belvo integration is disabled');
    }

    const dataset = dto.dataset ?? 'transactions';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.resolveTimeout());

    try {
      const response = await fetch(
        this.buildUrl(`/api/links/${encodeURIComponent(linkId)}/sync/`),
        {
          method: 'POST',
          signal: controller.signal,
          headers: this.buildHeaders(),
          body: JSON.stringify({ scope: dataset }),
        },
      );

      if (!response.ok) {
        const errorMessage = await this.extractErrorMessage(response);
        throw new HttpException(
          `Belvo sync request failed (${response.status}): ${errorMessage}`,
          response.status,
        );
      }

      const payload = (await response.json()) as Record<string, unknown>;

      return {
        linkId,
        dataset,
        scheduledAt:
          this.toIsoString(payload.scheduled_at) ??
          this.toIsoString(payload.created_at) ??
          new Date().toISOString(),
        status: this.getString(payload.status) ?? 'queued',
        taskId: this.getString(payload.id),
        startedAt: this.toIsoString(payload.started_at) ?? null,
        finishedAt: this.toIsoString(payload.finished_at) ?? null,
      } satisfies BelvoSyncResponse;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException('Belvo sync request timed out');
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to trigger Belvo synchronization for link=${linkId}: ${message}`);
      throw new ServiceUnavailableException('Failed to trigger Belvo synchronization');
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(path: string): string {
    const baseUrl = this.config.baseUrl ?? 'https://sandbox.belvo.com';
    return new URL(path, baseUrl).toString();
  }

  private resolveTimeout(): number {
    const timeout = this.config.timeoutMs ?? 15000;
    return Math.max(timeout, 1000);
  }

  private buildHeaders(): Record<string, string> {
    const secretId = this.config.secretId;
    const secretPassword = this.config.secretPassword;

    if (!secretId || !secretPassword) {
      throw new ServiceUnavailableException('Belvo credentials are not configured');
    }

    const basic = Buffer.from(`${secretId}:${secretPassword}`).toString('base64');

    return {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private getString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    return null;
  }

  private toIsoString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) {
      return null;
    }

    return date.toISOString();
  }

  private computeDefaultExpiry(): string {
    return new Date(Date.now() + 5 * 60 * 1000).toISOString();
  }

  private async extractErrorMessage(response: Response): Promise<string> {
    try {
      const data = (await response.json()) as Record<string, unknown>;
      const message = this.getString(data.detail ?? data.message);

      if (message) {
        return message;
      }

      return JSON.stringify(data);
    } catch {
      try {
        const text = await response.text();
        return text || 'Unknown error';
      } catch {
        return 'Unknown error';
      }
    }
  }
}
