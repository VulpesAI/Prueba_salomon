import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';

import { AlertOrchestratorService } from './alert-orchestrator.service';
import { MetricsUpdatedEvent, TransactionCreatedEvent } from './interfaces/alert-events.interface';
import { AlertRule, AlertResolution } from './interfaces/alert-rule.interface';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AlertRuleEvaluatorService {
  private readonly logger = new Logger(AlertRuleEvaluatorService.name);
  private readonly rules: AlertRule[] = [
    {
      id: 'large-expense',
      trigger: 'transaction',
      description: 'Notifica gastos superiores a 100,000 unidades monetarias.',
      channels: ['email', 'push', 'in_app'],
      severity: 'warning',
      evaluate: ({ event }: { trigger: 'transaction'; event: TransactionCreatedEvent; user: User }) => {
        if (event.transaction.type !== 'EXPENSE') {
          return null;
        }

        const amount = Number(event.transaction.amount);
        if (Number.isNaN(amount) || amount < 100000) {
          return null;
        }

        return {
          title: 'Gasto inusual detectado',
          message: `Se registró un gasto de ${amount.toLocaleString('es-PE', {
            minimumFractionDigits: 2,
          })} en ${event.transaction.description}.`,
          metadata: {
            amount,
            description: event.transaction.description,
            transactionId: event.transaction.id,
          },
        } satisfies AlertResolution;
      },
    },
    {
      id: 'cashflow-downturn',
      trigger: 'metric',
      description: 'Advierte de una tendencia negativa en el flujo proyectado.',
      channels: ['email', 'sms', 'in_app'],
      severity: 'critical',
      evaluate: ({ event }: { trigger: 'metric'; event: MetricsUpdatedEvent; user: User }) => {
        const summary: any = event.summary ?? {};
        const trend = summary.trend ?? {};
        if (trend.direction !== 'downward' || typeof trend.change === 'undefined') {
          return null;
        }

        const change = Number(trend.change ?? 0);
        if (change > -50000) {
          return null;
        }

        return {
          title: 'Proyección de flujo en descenso',
          message: 'Tus proyecciones muestran una caída pronunciada en la liquidez. Revisa tus gastos planificados.',
          metadata: {
            trend,
            category: event.category,
          },
          data: {
            category: event.category,
            severity: 'critical',
          },
        } satisfies AlertResolution;
      },
    },
  ];

  constructor(
    private readonly orchestrator: AlertOrchestratorService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @OnEvent('transactions.created')
  async handleTransactionCreated(event: TransactionCreatedEvent): Promise<void> {
    await this.evaluateRules('transaction', event);
  }

  @OnEvent('metrics.updated')
  async handleMetricsUpdated(event: MetricsUpdatedEvent): Promise<void> {
    await this.evaluateRules('metric', event);
  }

  private async evaluateRules(trigger: 'transaction' | 'metric', event: TransactionCreatedEvent | MetricsUpdatedEvent) {
    const user = await this.userRepository.findOne({ where: { id: event.userId } });

    if (!user) {
      this.logger.warn(`No user found for alert evaluation (trigger=${trigger}, user=${event.userId}).`);
      return;
    }

    const matchingRules = this.rules.filter((rule) => rule.trigger === trigger);

    for (const rule of matchingRules) {
      try {
        const resolution = rule.evaluate({ trigger, event: event as any, user });
        if (!resolution) {
          continue;
        }

        await this.orchestrator.dispatchAlert({
          user,
          title: resolution.title,
          message: resolution.message,
          metadata: resolution.metadata,
          data: resolution.data,
          eventType: rule.id,
          channels: rule.channels,
          severity: rule.severity,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to evaluate rule ${rule.id}: ${message}`);
      }
    }
  }
}
