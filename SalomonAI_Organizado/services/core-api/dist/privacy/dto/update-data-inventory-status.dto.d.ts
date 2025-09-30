import { DataInventoryStatus } from '../entities/data-inventory.entity';
export declare class UpdateDataInventoryStatusDto {
    status: DataInventoryStatus;
    reason?: string;
    requestedBy?: string;
}
