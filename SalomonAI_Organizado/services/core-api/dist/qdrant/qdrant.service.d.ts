import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantVectorService } from './qdrant.tokens';
interface CollectionConfig {
    size: number;
    distance: 'Cosine' | 'Euclid' | 'Dot';
}
export declare class QdrantService implements OnModuleInit, QdrantVectorService {
    private readonly configService;
    private readonly logger;
    private client;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    healthCheck(): Promise<boolean>;
    createCollection(name: string, config: CollectionConfig): Promise<void>;
    search(collectionName: string, embedding: number[], limit?: number, threshold?: number): Promise<Array<{
        payload: any;
        score: number;
    }>>;
    upsertPoint(collectionName: string, payload: any, embedding: number[]): Promise<void>;
    upsert(collectionName: string, points: Array<{
        vector: number[];
        payload?: any;
    }>): Promise<void>;
}
export {};
