import { FinancialMovementsService } from './financial-movements.service';
import { ClassifyMovementDto } from './dto/classify-movement.dto';
import { CreateFinancialMovementDto } from './dto/create-financial-movement.dto';
import { FindFinancialMovementsQueryDto } from './dto/find-financial-movements-query.dto';
import { User } from '../users/entities/user.entity';
import { UpdateFinancialMovementDto } from './dto/update-financial-movement.dto';
export declare class FinancialMovementsController {
    private readonly movementsService;
    constructor(movementsService: FinancialMovementsService);
    create(createDto: CreateFinancialMovementDto): Promise<import("./entities/financial-movement.entity").FinancialMovement>;
    classifyMovement(user: User, classifyDto: Omit<ClassifyMovementDto, 'userId'>): Promise<{
        category: string;
    }>;
    findAllByUser(user: User, queryDto: FindFinancialMovementsQueryDto): Promise<import("./financial-movements.service").PaginatedMovements>;
    getSummaryByUserAndPeriod(user: User, queryDto: FindFinancialMovementsQueryDto): Promise<import("./financial-movements.service").CategorySummary[]>;
    getSavingsPotential(user: User, category: string): Promise<{
        potentialMonthlySavings: number;
    }>;
    updateCategory(user: User, movementId: string, updateDto: Omit<UpdateFinancialMovementDto, 'userId'>): Promise<import("./entities/financial-movement.entity").FinancialMovement>;
}
