import { RetentionPolicyAction } from '../entities/retention-policy.entity';
export declare class UpdateRetentionPolicyDto {
    retentionPeriodDays?: number;
    gracePeriodDays?: number;
    action?: RetentionPolicyAction;
    legalBasis?: string;
    requestedBy?: string;
}
