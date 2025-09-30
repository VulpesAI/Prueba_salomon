import { RetentionPolicyAction } from '../entities/retention-policy.entity';
export declare class CreateRetentionPolicyDto {
    dataCategory: string;
    retentionPeriodDays: number;
    gracePeriodDays?: number;
    action?: RetentionPolicyAction;
    legalBasis?: string;
    requestedBy?: string;
}
