import { User } from '../../users/entities/user.entity';
import { NotificationChannel, NotificationSeverity } from '../../notifications/interfaces/notification.types';
import { MetricsUpdatedEvent, TransactionCreatedEvent } from './alert-events.interface';

export type AlertTrigger = 'transaction' | 'metric';

export interface AlertResolution {
  message: string;
  title?: string;
  metadata?: Record<string, any>;
  data?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  trigger: AlertTrigger;
  description: string;
  channels: NotificationChannel[];
  severity: NotificationSeverity;
  evaluate: (
    context:
      | { trigger: 'transaction'; event: TransactionCreatedEvent; user: User }
      | { trigger: 'metric'; event: MetricsUpdatedEvent; user: User },
  ) => AlertResolution | null;
}
