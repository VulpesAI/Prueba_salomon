import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClassificationService } from './classification.service';
import { ClassifyTransactionDto, TrainTransactionDto, CorrectClassificationDto, ClassificationResultDto } from './dto/transaction.dto';
export declare class ClassificationController {
    private readonly classificationService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(classificationService: ClassificationService, eventEmitter: EventEmitter2);
    classifyTransaction(dto: ClassifyTransactionDto): Promise<ClassificationResultDto>;
    trainModel(dto: TrainTransactionDto): Promise<{
        success: boolean;
        message: string;
        training: {
            text: string;
            category: string;
            modelVersion: string;
            confidence?: number;
        };
    }>;
    correctClassification(dto: CorrectClassificationDto): Promise<{
        success: boolean;
        message: string;
        correction: {
            description: string;
            correctCategory: string;
            previousCategory?: string;
            modelVersion: string;
            notes?: string;
        };
    }>;
    getModelMetrics(): Promise<{
        model: {
            version: string;
            totalClassifications: number;
            accuracy: number;
            recentClassifications: number;
        };
        performance: {
            cacheSize: number;
            maxCacheSize: number;
            cacheHitRate?: number;
        };
        infrastructure: {
            collectionName: string;
            documentsInCorpus?: number;
            lastUpdate: string;
        };
    }>;
    healthCheck(): Promise<{
        status: string;
        timestamp: string;
        service: string;
        version: string;
        dependencies: Record<string, string>;
    }>;
}
