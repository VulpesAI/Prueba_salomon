import { Repository } from 'typeorm';
import { AlertOrchestratorService } from './alert-orchestrator.service';
import { MetricsUpdatedEvent, TransactionCreatedEvent } from './interfaces/alert-events.interface';
import { User } from '../users/entities/user.entity';
export declare class AlertRuleEvaluatorService {
    private readonly orchestrator;
    private readonly userRepository;
    private readonly logger;
    private readonly rules;
    constructor(orchestrator: AlertOrchestratorService, userRepository: Repository<User>);
    handleTransactionCreated(event: TransactionCreatedEvent): Promise<void>;
    handleMetricsUpdated(event: MetricsUpdatedEvent): Promise<void>;
    private evaluateRules;
}
