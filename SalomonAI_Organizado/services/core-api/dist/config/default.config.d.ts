export declare const DEFAULT_CONFIG: {
    readonly env: "development";
    readonly port: 8080;
    readonly database: {
        readonly host: "postgres";
        readonly port: 5432;
        readonly username: "postgres";
        readonly password: "postgres";
        readonly database: "salomon";
    };
    readonly jwt: {
        readonly secret: "your-secret-key";
        readonly expiresIn: "24h";
    };
    readonly kafka: {
        readonly broker: "kafka:9092";
        readonly clientId: "salomon-api";
    };
    readonly qdrant: {
        readonly url: "http://qdrant:6333";
        readonly collectionName: "transactions";
    };
    readonly forecasting: {
        readonly engineUrl: "http://forecasting-engine:8003";
        readonly horizonDays: 30;
    };
    readonly recommendations: {
        readonly engineUrl: "http://recommendation-engine:8004";
        readonly timeoutMs: 8000;
    };
    readonly api: {
        readonly globalPrefix: "api/v1";
        readonly corsOrigin: "http://localhost:3001";
    };
};
