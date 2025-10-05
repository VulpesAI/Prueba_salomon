import {
  HttpException,
  Injectable,
  Logger,
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch, RequestInit } from 'undici';

import type { RecommendationsConfig } from '../config/configuration';
import { SubmitRecommendationFeedbackDto } from './dto/submit-feedback.dto';

export interface RecommendationHistoryItem {
  id: string;
  title: string;
  description: string;
  score: number;
  category: string;
  explanation: string;
  generatedAt: string;
  cluster: number | null;
}

export interface RecommendationFeedbackResponse {
  status: string;
  submittedAt: string;
}

@Injectable()
export class RecommendationsGatewayService {
  private readonly logger = new Logger(RecommendationsGatewayService.name);
  private readonly config: RecommendationsConfig | undefined;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<RecommendationsConfig>('recommendations', { infer: true });
  }

  async submitFeedback(
    recommendationId: string,
    payload: SubmitRecommendationFeedbackDto,
  ): Promise<RecommendationFeedbackResponse> {
    const response = await this.request<RecommendationFeedbackResponse>(
      '/recommendations/feedback',
      {
        method: 'POST',
        body: JSON.stringify({
          recommendationId,
          userId: payload.userId,
          score: payload.score,
          comment: payload.comment ?? null,
        }),
      },
    );

    return response;
  }

  async getHistory(userId: string): Promise<RecommendationHistoryItem[]> {
    const response = await this.request<RecommendationHistoryItem[]>(
      `/recommendations/personalized/${encodeURIComponent(userId)}/history`,
      { method: 'GET' },
    );
    return response;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    if (!this.config?.baseUrl) {
      throw new ServiceUnavailableException('Recommendation engine URL is not configured');
    }

    const timeoutMs = Math.max(this.config.timeoutMs ?? 5000, 1000);
    const url = new URL(path, this.config.baseUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(init.headers as Record<string, string> | undefined),
        },
      });

      if (!response.ok) {
        const text = await response.text();
        throw new HttpException(
          `Recommendation engine error (${response.status}): ${text || response.statusText}`,
          response.status,
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new RequestTimeoutException('Recommendation engine request timed out');
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to contact recommendation engine: ${message}`);
      throw new ServiceUnavailableException('Recommendation engine is unavailable');
    } finally {
      clearTimeout(timeout);
    }
  }
}
