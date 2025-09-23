import { ConfigService } from '@nestjs/config';
import { INestApplication } from '@nestjs/common';
export declare const createDatabaseConfig: (configService: ConfigService) => {
    type: "postgres";
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    entities: string[];
    synchronize: boolean;
    logging: boolean;
    ssl: boolean;
    extra: {
        max: number;
        connectionTimeoutMillis: number;
        idleTimeoutMillis: number;
    };
};
export declare const createQdrantConfig: (configService: ConfigService) => {
    url: string;
    host: string;
    port: number;
    collectionName: string;
};
export declare const createCacheConfig: (configService: ConfigService) => {
    ttl: number;
    max: number;
    store: string;
};
export declare const createThrottlerConfig: (configService: ConfigService) => {
    name: string;
    ttl: number;
    limit: number;
}[];
export declare const createJwtConfig: (configService: ConfigService) => {
    secret: string;
    signOptions: {
        expiresIn: string;
    };
};
export declare const setupGlobalPipes: (app: INestApplication) => void;
export declare const setupGlobalPrefix: (app: INestApplication, configService: ConfigService) => void;
export declare const setupCors: (app: INestApplication, configService: ConfigService) => void;
export declare const setupSwagger: (app: INestApplication) => void;
