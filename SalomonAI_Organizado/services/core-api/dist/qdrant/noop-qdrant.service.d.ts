import { QdrantVectorService } from './qdrant.tokens';
export declare class NoopQdrantService implements QdrantVectorService {
    private readonly logger;
    onModuleInit(): Promise<void>;
    healthCheck(): Promise<boolean>;
    createCollection(): Promise<void>;
    search(): Promise<Array<{
        payload: any;
        score: number;
    }>>;
    upsertPoint(): Promise<void>;
    upsert(): Promise<void>;
}
