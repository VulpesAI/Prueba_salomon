import { Repository } from 'typeorm';
import { QdrantVectorService } from '../qdrant/qdrant.tokens';
import { CreateFinancialMovementDto } from './dto/create-financial-movement.dto';
import { UpdateFinancialMovementDto } from './dto/update-financial-movement.dto';
import { FinancialMovement } from './entities/financial-movement.entity';
import { User } from '../users/entities/user.entity';
import { ClassifyMovementDto } from './dto/classify-movement.dto';
import { FindFinancialMovementsQueryDto } from './dto/find-financial-movements-query.dto';
export interface CategorySummary {
    category: string;
    total: number;
}
export interface PaginatedMovements {
    data: FinancialMovement[];
    meta: {
        total: number;
        page: number;
        limit: number;
        lastPage: number;
    };
}
export declare class FinancialMovementsService {
    private readonly movementRepository;
    private readonly userRepository;
    private readonly qdrantService;
    constructor(movementRepository: Repository<FinancialMovement>, userRepository: Repository<User>, qdrantService: QdrantVectorService);
    create(dto: CreateFinancialMovementDto): Promise<FinancialMovement>;
    classifyBySimilarity(dto: ClassifyMovementDto): Promise<string>;
    findAllByUser(userId: string, queryDto: FindFinancialMovementsQueryDto): Promise<PaginatedMovements>;
    getSummaryByUserAndPeriod(userId: string, startDate: Date, endDate: Date): Promise<CategorySummary[]>;
    getSavingsPotential(userId: string, category: string): Promise<{
        potentialMonthlySavings: number;
    }>;
    updateCategory(movementId: string, dto: UpdateFinancialMovementDto): Promise<FinancialMovement>;
}
