export declare const QDRANT_SERVICE: unique symbol;
export interface QdrantVectorService {
    onModuleInit(): Promise<void> | void;
    healthCheck(): Promise<boolean>;
    createCollection(name: string, config: {
        size: number;
        distance: 'Cosine' | 'Euclid' | 'Dot';
    }): Promise<void>;
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
