import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    if (!this.metricsService.isEnabled()) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();

    if (request.path === '/metrics') {
      return next.handle();
    }

    const response = httpContext.getResponse<Response>();
    const method = request.method;
    const route = request.route?.path ?? request.path ?? request.url;
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
          this.metricsService.recordApiRequest(method, route, response.statusCode, durationMs);
        },
        error: (err: unknown) => {
          const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
          const status = this.extractStatus(err);
          this.metricsService.recordApiRequest(method, route, status, durationMs);
        },
      }),
    );
  }

  private extractStatus(err: unknown): number {
    if (typeof err === 'object' && err !== null && 'getStatus' in err && typeof (err as any).getStatus === 'function') {
      try {
        return (err as any).getStatus();
      } catch (error) {
        // Ignore and fallback to 500 below
      }
    }

    if (typeof err === 'object' && err !== null && 'status' in err && typeof (err as any).status === 'number') {
      return (err as any).status;
    }

    return 500;
  }
}
