import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class NlpService implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private readonly tokenizer;
    private readonly stemmer;
    private readonly tfidf;
    private readonly analyzer;
    private readonly embeddingCache;
    private readonly maxCacheSize;
    private readonly financialStopwords;
    private readonly synonymMap;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    private initializeModels;
    private loadPretrainedData;
    private preprocessText;
    private expandSynonyms;
    generateEmbedding(text: string): Promise<number[]>;
    private generateTfIdfVector;
    private normalizeVector;
    extractKeywords(text: string, limit?: number): string[];
    calculateSimilarity(vector1: number[], vector2: number[]): number;
    analyzeSentiment(text: string): {
        score: number;
        sentiment: 'positive' | 'negative' | 'neutral';
    };
    clearCache(): void;
    getStats(): {
        cacheSize: number;
        maxCacheSize: number;
        documentsInCorpus: number;
    };
}
