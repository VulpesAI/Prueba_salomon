import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ApiMetricKey = `${string}|${string}|${number}`;
type QueueMetricKey = `${string}|${string}`;
type ModelMetricKey = `${string}|${string}`;

type SummaryMetric = {
  count: number;
  sum: number;
};

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly metricsEnabled: boolean;

  private readonly apiRequests = new Map<ApiMetricKey, SummaryMetric>();
  private readonly queueMessages = new Map<QueueMetricKey, number>();
  private readonly modelInferences = new Map<ModelMetricKey, SummaryMetric>();
  private readonly modelConfidence = new Map<string, number>();
  private readonly modelCacheHits = new Map<string, number>();
  private readonly queueConnections = new Map<string, number>();

  constructor(private readonly configService: ConfigService) {
    this.metricsEnabled = this.parseEnabledFlag(
      this.configService.get<string | boolean>('METRICS_ENABLED', true),
    );

    if (!this.metricsEnabled) {
      this.logger.warn('Metrics collection is disabled via METRICS_ENABLED flag.');
    }
  }

  isEnabled(): boolean {
    return this.metricsEnabled;
  }

  recordApiRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    if (!this.metricsEnabled) {
      return;
    }

    const normalizedRoute = this.normalizeRoute(route);
    const key: ApiMetricKey = `${method}|${normalizedRoute}|${statusCode}`;
    const current = this.apiRequests.get(key) ?? { count: 0, sum: 0 };

    current.count += 1;
    current.sum += durationMs / 1000;

    this.apiRequests.set(key, current);
  }

  recordQueueMessage(topic: string, status: 'sent' | 'failed'): void {
    if (!this.metricsEnabled) {
      return;
    }

    const key: QueueMetricKey = `${topic}|${status}`;
    const current = this.queueMessages.get(key) ?? 0;
    this.queueMessages.set(key, current + 1);
  }

  updateQueueConnectionState(clientId: string, connected: boolean): void {
    if (!this.metricsEnabled) {
      return;
    }

    this.queueConnections.set(clientId, connected ? 1 : 0);
  }

  recordModelInference(
    model: string,
    outcome: string,
    durationMs: number,
    confidence?: number,
  ): void {
    if (!this.metricsEnabled) {
      return;
    }

    const key: ModelMetricKey = `${model}|${outcome}`;
    const current = this.modelInferences.get(key) ?? { count: 0, sum: 0 };

    current.count += 1;
    current.sum += durationMs / 1000;

    this.modelInferences.set(key, current);

    if (typeof confidence === 'number') {
      this.modelConfidence.set(model, confidence);
    }
  }

  recordModelCacheHit(model: string): void {
    if (!this.metricsEnabled) {
      return;
    }

    const current = this.modelCacheHits.get(model) ?? 0;
    this.modelCacheHits.set(model, current + 1);
  }

  async getMetrics(): Promise<string> {
    if (!this.metricsEnabled) {
      return '# Metrics disabled by configuration\n';
    }

    const lines: string[] = [];

    // API metrics
    lines.push('# HELP core_api_requests_total Total HTTP requests handled by the core API.');
    lines.push('# TYPE core_api_requests_total counter');
    for (const [key, metric] of this.apiRequests.entries()) {
      const [method, route, status] = key.split('|');
      lines.push(
        `core_api_requests_total{service="core-api",method="${method}",route="${route}",status="${status}"} ${metric.count}`,
      );
    }

    lines.push('# HELP core_api_request_duration_seconds_sum Total duration of HTTP requests in seconds.');
    lines.push('# TYPE core_api_request_duration_seconds_sum gauge');
    for (const [key, metric] of this.apiRequests.entries()) {
      const [method, route, status] = key.split('|');
      lines.push(
        `core_api_request_duration_seconds_sum{service="core-api",method="${method}",route="${route}",status="${status}"} ${metric.sum.toFixed(6)}`,
      );
      lines.push(
        `core_api_request_duration_seconds_count{service="core-api",method="${method}",route="${route}",status="${status}"} ${metric.count}`,
      );
    }

    // Queue metrics
    lines.push('# HELP core_queue_messages_total Kafka messages produced by the core API.');
    lines.push('# TYPE core_queue_messages_total counter');
    for (const [key, count] of this.queueMessages.entries()) {
      const [topic, status] = key.split('|');
      lines.push(
        `core_queue_messages_total{service="core-api",topic="${topic}",status="${status}"} ${count}`,
      );
    }

    lines.push('# HELP core_queue_connection_state Kafka producer connection status (1 connected, 0 disconnected).');
    lines.push('# TYPE core_queue_connection_state gauge');
    for (const [client, state] of this.queueConnections.entries()) {
      lines.push(`core_queue_connection_state{service="core-api",client="${client}"} ${state}`);
    }

    // Model metrics
    lines.push('# HELP core_model_inference_total Total inferences executed by core AI models.');
    lines.push('# TYPE core_model_inference_total counter');
    for (const [key, metric] of this.modelInferences.entries()) {
      const [model, outcome] = key.split('|');
      lines.push(
        `core_model_inference_total{service="core-api",model="${model}",outcome="${outcome}"} ${metric.count}`,
      );
    }

    lines.push('# HELP core_model_inference_duration_seconds_sum Total inference duration in seconds.');
    lines.push('# TYPE core_model_inference_duration_seconds_sum gauge');
    for (const [key, metric] of this.modelInferences.entries()) {
      const [model, outcome] = key.split('|');
      lines.push(
        `core_model_inference_duration_seconds_sum{service="core-api",model="${model}",outcome="${outcome}"} ${metric.sum.toFixed(6)}`,
      );
      lines.push(
        `core_model_inference_duration_seconds_count{service="core-api",model="${model}",outcome="${outcome}"} ${metric.count}`,
      );
    }

    lines.push('# HELP core_model_cache_hits_total Cache hits when serving model predictions.');
    lines.push('# TYPE core_model_cache_hits_total counter');
    for (const [model, hits] of this.modelCacheHits.entries()) {
      lines.push(`core_model_cache_hits_total{service="core-api",model="${model}"} ${hits}`);
    }

    lines.push('# HELP core_model_last_confidence Confidence of the last successful model prediction.');
    lines.push('# TYPE core_model_last_confidence gauge');
    for (const [model, confidence] of this.modelConfidence.entries()) {
      lines.push(`core_model_last_confidence{service="core-api",model="${model}"} ${confidence}`);
    }

    lines.push('');
    return lines.join('\n');
  }

  private normalizeRoute(route: string): string {
    if (!route) {
      return 'unknown';
    }

    const cleaned = route.split('?')[0];
    return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  }

  private parseEnabledFlag(value: string | boolean | undefined): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return !['false', '0', 'no', 'off'].includes(normalized);
    }

    return true;
  }
}
