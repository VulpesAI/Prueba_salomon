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
import { DashboardRecommendationFeedbackDto } from './dto/dashboard-recommendation-feedback.dto';

export interface DashboardRecommendationDto {
  id: string;
  title: string;
  description: string;
  score: number;
  category: string;
  explanation: string;
  generatedAt: string;
  cluster: number | null;
}

export interface DashboardRecommendationFeedbackResponse {
  status: string;
  submittedAt: string;
}

interface PersonalizedRecommendationsOptions {
  refresh?: boolean;
}

@Injectable()
export class DashboardRecommendationsGatewayService {
  private readonly logger = new Logger(DashboardRecommendationsGatewayService.name);
  private readonly config: RecommendationsConfig | undefined;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<RecommendationsConfig>('recommendations', { infer: true });
  }

  async getRecommendations(
    userId: string,
    options: PersonalizedRecommendationsOptions = {},
  ): Promise<DashboardRecommendationDto[]> {
    const response = await this.request<DashboardRecommendationDto[]>(
      `/recommendations/personalized/${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        query: (options.refresh ?? true) ? { refresh: 'true' } : undefined,
      },
    );

    return response ?? [];
  }

  async submitFeedback(
    payload: DashboardRecommendationFeedbackDto,
  ): Promise<DashboardRecommendationFeedbackResponse> {
    const response = await this.request<DashboardRecommendationFeedbackResponse>(
      '/recommendations/feedback',
      {
        method: 'POST',
        body: JSON.stringify({
          recommendationId: payload.recommendationId,
          userId: payload.userId,
          score: payload.score,
          comment: payload.comment ?? null,
        }),
      },
    );

    return response;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { query?: Record<string, string> },
  ): Promise<T> {
    if (!this.config?.baseUrl) {
      throw new ServiceUnavailableException('Recommendation engine URL is not configured');
    }

    const timeoutMs = Math.max(this.config.timeoutMs ?? 5000, 1000);
    const url = new URL(path, this.config.baseUrl);
    const { query, ...requestInit } = init;

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...requestInit,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(requestInit.headers as Record<string, string> | undefined),
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
