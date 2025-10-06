import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { DashboardService } from '../dashboard/dashboard.service';
import { DashboardForecastingGatewayService } from '../dashboard/forecasting-gateway.service';
import { DashboardGranularity } from '../dashboard/dto/dashboard-summary-query.dto';
import { ResolveIntentDto } from './dto/resolve-intent.dto';
import { AiSummaryQueryDto } from './dto/ai-summary-query.dto';

interface IntentResolution {
  intent: string;
  status: 'resolved' | 'unsupported' | 'error';
  data?: unknown;
  message?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly forecastingGateway: DashboardForecastingGatewayService,
  ) {}

  async resolveIntent(dto: ResolveIntentDto): Promise<IntentResolution> {
    try {
      switch (dto.intent) {
        case 'saldo_actual':
        case 'balance.current':
          return this.resolveBalanceIntent(dto);
        case 'gasto_mes':
        case 'spending.current_month':
          return this.resolveMonthlySpendingIntent(dto);
        case 'proyeccion_flujo':
        case 'forecast.cashflow':
          return this.resolveForecastIntent(dto);
        default:
          return {
            intent: dto.intent,
            status: 'unsupported',
            message: `Intent ${dto.intent} is not supported yet`,
          } satisfies IntentResolution;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to resolve intent ${dto.intent}: ${message}`);
      return { intent: dto.intent, status: 'error', message } satisfies IntentResolution;
    }
  }

  async getSessionSummary(sessionId: string, query: AiSummaryQueryDto) {
    const { start, end } = this.resolveQueryRange(query);

    const resumen = await this.dashboardService.getResumen({
      userId: query.userId,
      accountId: query.accountId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    const summary = await this.dashboardService.getSummary({
      userId: query.userId,
      accountId: query.accountId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      granularity: DashboardGranularity.MONTH,
    });

    return {
      sessionId,
      userId: query.userId,
      generatedAt: new Date().toISOString(),
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      currency: summary.totals.currency,
      saldoActual: resumen.saldoActual,
      ingresos: summary.totals.inflow,
      gastos: summary.totals.outflow,
      neto: summary.totals.net,
      categoriaPrincipal: resumen.categoriaPrincipal,
      proyeccion: resumen.proyeccion,
    };
  }

  private async resolveBalanceIntent(dto: ResolveIntentDto): Promise<IntentResolution> {
    const resumen = await this.dashboardService.getResumen({
      userId: dto.userId,
      accountId: this.extractAccountId(dto.parameters),
    });

    return {
      intent: dto.intent,
      status: 'resolved',
      data: {
        saldoActual: resumen.saldoActual,
        categoriaPrincipal: resumen.categoriaPrincipal,
      },
    } satisfies IntentResolution;
  }

  private async resolveMonthlySpendingIntent(dto: ResolveIntentDto): Promise<IntentResolution> {
    const { start, end } = this.resolveRangeFromParameters(dto.parameters);

    const summary = await this.dashboardService.getSummary({
      userId: dto.userId,
      accountId: this.extractAccountId(dto.parameters),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      granularity: DashboardGranularity.MONTH,
    });

    return {
      intent: dto.intent,
      status: 'resolved',
      data: {
        gastos: summary.totals.outflow,
        ingresos: summary.totals.inflow,
        neto: summary.totals.net,
        currency: summary.totals.currency,
        range: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        categorias: summary.categories,
      },
    } satisfies IntentResolution;
  }

  private async resolveForecastIntent(dto: ResolveIntentDto): Promise<IntentResolution> {
    const response = await this.forecastingGateway.fetchForecast(dto.userId, {
      horizonDays: this.extractNumber(dto.parameters?.horizonDays ?? dto.parameters?.horizon),
      model: this.extractModel(dto.parameters?.model),
      refresh: this.extractBoolean(dto.parameters?.refresh),
      forecastType: 'cashflow_projection',
    });

    return {
      intent: dto.intent,
      status: 'resolved',
      data: response,
    } satisfies IntentResolution;
  }

  private resolveQueryRange(query: AiSummaryQueryDto) {
    const end = this.parseDate(query.endDate) ?? new Date();
    const start = this.parseDate(query.startDate) ?? new Date(end.getFullYear(), end.getMonth(), 1);

    if (start > end) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }

    return { start, end };
  }

  private resolveRangeFromParameters(parameters?: Record<string, unknown>) {
    const end = this.parseDate(parameters?.endDate ?? parameters?.to) ?? new Date();
    const start =
      this.parseDate(parameters?.startDate ?? parameters?.from) ??
      new Date(end.getFullYear(), end.getMonth(), 1);

    if (start > end) {
      throw new BadRequestException('The requested period is invalid');
    }

    return { start, end };
  }

  private parseDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return Number.isNaN(value.valueOf()) ? null : value;
    }

    if (typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.valueOf()) ? null : date;
    }

    if (typeof value === 'string') {
      const date = new Date(value);
      return Number.isNaN(date.valueOf()) ? null : date;
    }

    return null;
  }

  private extractNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
  }

  private extractBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') {
        return true;
      }

      if (value.toLowerCase() === 'false') {
        return false;
      }
    }

    return undefined;
  }

  private extractModel(value: unknown): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    return undefined;
  }

  private extractAccountId(parameters?: Record<string, unknown>): string | undefined {
    const value = parameters?.accountId;
    if (typeof value === 'string') {
      return value;
    }

    return undefined;
  }
}
