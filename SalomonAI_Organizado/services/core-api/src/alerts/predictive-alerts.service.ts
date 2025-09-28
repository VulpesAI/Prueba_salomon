import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

import { FinancialForecastsService } from '../financial-forecasts/financial-forecasts.service';

export interface PredictiveAlert {
  id: string;
  type: 'cashflow' | 'spending' | 'savings';
  severity: 'low' | 'medium' | 'high';
  message: string;
  forecastDate: string;
  details?: Record<string, any>;
}

@Injectable()
export class PredictiveAlertsService {
  constructor(private readonly forecastsService: FinancialForecastsService) {}

  async generateAlerts(userId: string): Promise<PredictiveAlert[]> {
    const forecasts = await this.forecastsService.getForecastSeries(userId);

    if (forecasts.length === 0) {
      return [];
    }

    const alerts: PredictiveAlert[] = [];
    const amounts = forecasts.map((item) => Number(item.predictedValue));
    const minValue = Math.min(...amounts);

    if (minValue < -50000) {
      const criticalPoint = forecasts[amounts.indexOf(minValue)];
      alerts.push({
        id: uuid(),
        type: 'cashflow',
        severity: 'high',
        message: 'Se proyecta un déficit de caja significativo en los próximos días.',
        forecastDate: criticalPoint.forecastDate.toISOString().split('T')[0],
        details: {
          expectedAmount: Number(minValue.toFixed(2)),
        },
      });
    }

    const last = amounts[amounts.length - 1];
    const average = amounts.reduce((acc, value) => acc + value, 0) / amounts.length;
    if (last < average * 0.6) {
      const criticalPoint = forecasts[forecasts.length - 1];
      alerts.push({
        id: uuid(),
        type: 'spending',
        severity: 'medium',
        message: 'Tus gastos proyectados superan el promedio reciente. Considera revisar tus categorías de gasto.',
        forecastDate: criticalPoint.forecastDate.toISOString().split('T')[0],
        details: {
          projectedAmount: Number(last.toFixed(2)),
          averageAmount: Number(average.toFixed(2)),
        },
      });
    }

    const positiveTrend = last - amounts[0];
    if (positiveTrend > 80000) {
      alerts.push({
        id: uuid(),
        type: 'savings',
        severity: 'low',
        message: 'Se proyecta un excedente de liquidez. Evalúa mover parte a tu fondo de ahorro.',
        forecastDate: forecasts[forecasts.length - 1].forecastDate.toISOString().split('T')[0],
        details: {
          projectedIncrease: Number(positiveTrend.toFixed(2)),
        },
      });
    }

    return alerts;
  }
}
