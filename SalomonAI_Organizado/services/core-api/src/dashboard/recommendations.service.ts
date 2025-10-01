import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import { SubmitRecommendationFeedbackDto } from './dto/submit-recommendation-feedback.dto';
import { RecommendationsPort } from './recommendations.tokens';

export interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  score: number;
  category: string;
  explanation: string;
  generatedAt: string;
  cluster?: number | null;
}

export interface PersonalizedRecommendations {
  userId: string;
  generatedAt: string;
  recommendations: RecommendationItem[];
  featureSummary?: Record<string, any> | null;
}

@Injectable()
export class RecommendationsService implements RecommendationsPort {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly timeout: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get('app.recommendations') as
      | { engineUrl?: string; timeoutMs?: number }
      | undefined;

    this.timeout = config?.timeoutMs || this.configService.get<number>('RECOMMENDATION_ENGINE_TIMEOUT_MS', 8000);
  }

  async getPersonalizedRecommendations(userId: string, refresh = false): Promise<PersonalizedRecommendations> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<PersonalizedRecommendations>(`/recommendations/personalized/${userId}`, {
          params: refresh ? { refresh: true } : undefined,
          timeout: this.timeout,
        }),
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        this.logger.warn(`No hay recomendaciones disponibles para el usuario ${userId}`);
        return {
          userId,
          generatedAt: new Date().toISOString(),
          recommendations: [],
          featureSummary: null,
        };
      }

      const message = axiosError.message || 'Error desconocido al solicitar recomendaciones personalizadas';
      this.logger.error(`RecommendationEngine error: ${message}`, axiosError.stack);
      throw new InternalServerErrorException('No fue posible obtener recomendaciones personalizadas.');
    }
  }

  async sendFeedback(userId: string, payload: SubmitRecommendationFeedbackDto): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(
          '/recommendations/feedback',
          {
            recommendationId: payload.recommendationId,
            userId,
            score: payload.score,
            comment: payload.comment,
          },
          {
            timeout: this.timeout,
          },
        ),
      );
    } catch (error) {
      const axiosError = error as AxiosError;
      const message = axiosError.message || 'Error desconocido al enviar feedback de recomendaciones';
      this.logger.error(`No fue posible enviar feedback: ${message}`, axiosError.stack);
      throw new InternalServerErrorException('No fue posible registrar tu feedback en este momento.');
    }
  }
}
