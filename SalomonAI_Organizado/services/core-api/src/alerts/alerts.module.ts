import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AlertsController } from './alerts.controller';
import { PredictiveAlertsService } from './predictive-alerts.service';
import { FinancialForecastsModule } from '../financial-forecasts/financial-forecasts.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { Notification } from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { AlertOrchestratorService } from './alert-orchestrator.service';
import { AlertRuleEvaluatorService } from './alert-rule-evaluator.service';
import { SendGridEmailProvider } from './providers/sendgrid-email.provider';
import { FirebasePushProvider } from './providers/firebase-push.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';

@Module({
  imports: [
    FinancialForecastsModule,
    FirebaseModule.register({ enabled: true }),
    TypeOrmModule.forFeature([Notification, User]),
  ],
  controllers: [AlertsController],
  providers: [
    PredictiveAlertsService,
    AlertOrchestratorService,
    AlertRuleEvaluatorService,
    SendGridEmailProvider,
    FirebasePushProvider,
    TwilioSmsProvider,
  ],
  exports: [PredictiveAlertsService, AlertOrchestratorService],
})
export class AlertsModule {}
