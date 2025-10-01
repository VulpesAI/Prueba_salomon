import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QDRANT_SERVICE, QdrantVectorService } from '../qdrant/qdrant.tokens';
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

@Injectable()
export class FinancialMovementsService {
  constructor(
    @InjectRepository(FinancialMovement)
    private readonly movementRepository: Repository<FinancialMovement>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(QDRANT_SERVICE)
    private readonly qdrantService: QdrantVectorService,
  ) {}

  async create(dto: CreateFinancialMovementDto): Promise<FinancialMovement> {
    const user = await this.userRepository.findOneBy({ id: dto.userId });
    if (!user) {
      throw new NotFoundException(
        `Usuario con ID "${dto.userId}" no encontrado.`,
      );
    }

    const newMovement = this.movementRepository.create({ ...dto, user });
    const savedMovement = await this.movementRepository.save(newMovement);

    // Después de guardar en la BD, almacenar en Qdrant para futuras clasificaciones
    if (dto.embedding) {
      await this.qdrantService.upsertPoint(
        'financial_movements', 
        { 
          userId: user.id,
          category: dto.category,
          description: dto.description
        }, 
        dto.embedding
      );
    }

    return savedMovement;
  }

  async classifyBySimilarity(
    dto: ClassifyMovementDto,
  ): Promise<string> {
    // Buscar movimientos similares en Qdrant
    const similarPoints = await this.qdrantService.search(
      'financial_movements',
      dto.embedding,
      5,
      0.8
    );

    if (similarPoints.length > 0) {
      // Retornar la categoría del punto más similar
      return similarPoints[0].payload.category || 'NO_CLASIFICADO';
    }

    return 'NO_CLASIFICADO';
  }

  async findAllByUser(
    userId: string,
    queryDto: FindFinancialMovementsQueryDto,
  ): Promise<PaginatedMovements> {
    const { startDate, endDate, page = 1, limit = 10 } = queryDto;

    const queryBuilder = this.movementRepository
      .createQueryBuilder('movement')
      .innerJoin('movement.user', 'user')
      .where('user.id = :userId', { userId });

    if (startDate) {
      queryBuilder.andWhere('movement.transactionDate >= :startDate', {
        startDate,
      });
    }

    if (endDate) {
      queryBuilder.andWhere('movement.transactionDate <= :endDate', {
        endDate,
      });
    }

    queryBuilder
      .orderBy('movement.transactionDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getSummaryByUserAndPeriod(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CategorySummary[]> {
    const result = await this.movementRepository
      .createQueryBuilder('movement')
      .select('movement.category', 'category')
      .addSelect('SUM(movement.amount)', 'total')
      .where('movement.user_id = :userId', { userId })
      .andWhere('movement.transactionDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('movement.category')
      .orderBy('total', 'DESC')
      .getRawMany();

    return result.map((item) => ({
      ...item,
      total: parseFloat(item.total),
    }));
  }

  async getSavingsPotential(
    userId: string,
    category: string,
  ): Promise<{ potentialMonthlySavings: number }> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await this.movementRepository
      .createQueryBuilder('movement')
      .select('SUM(movement.amount)', 'totalSpent')
      .addSelect(
        "COUNT(DISTINCT(DATE_TRUNC('month', movement.transactionDate)))",
        'monthsWithSpend',
      )
      .where('movement.user_id = :userId', { userId })
      .andWhere('movement.category = :category', { category })
      .andWhere('movement.transactionDate >= :sixMonthsAgo', { sixMonthsAgo })
      .getRawOne();

    const totalSpent = parseFloat(result.totalSpent) || 0;
    const monthsWithSpend = parseInt(result.monthsWithSpend, 10) || 1;

    const potentialMonthlySavings = totalSpent / monthsWithSpend;

    return {
      potentialMonthlySavings: Math.round(potentialMonthlySavings),
    };
  }

  async updateCategory(
    movementId: string,
    dto: UpdateFinancialMovementDto,
  ): Promise<FinancialMovement> {
    const movement = await this.movementRepository.findOne({
      where: { id: movementId, user: { id: dto.userId } },
    });

    if (!movement) {
      throw new NotFoundException(
        `Movimiento con ID "${movementId}" no encontrado o no pertenece al usuario.`,
      );
    }

    movement.category = dto.category;

    const updatedMovement = await this.movementRepository.save(movement);

    if (updatedMovement.embedding) {
      await this.qdrantService.upsertPoint(
        'financial_movements',
        {
          userId: movement.user.id,
          category: updatedMovement.category,
          description: updatedMovement.description
        },
        updatedMovement.embedding
      );
    }

    return updatedMovement;
  }
}
