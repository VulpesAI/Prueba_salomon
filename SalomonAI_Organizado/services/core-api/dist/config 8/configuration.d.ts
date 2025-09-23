declare const _default: (() => {
    env: string;
    port: number;
    database: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    kafka: {
        broker: string;
        clientId: string;
    };
    qdrant: {
        url: string;
        collectionName: string;
    };
    api: {
        globalPrefix: "api/v1";
        corsOrigin: string;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    env: string;
    port: number;
    database: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    kafka: {
        broker: string;
        clientId: string;
    };
    qdrant: {
        url: string;
        collectionName: string;
    };
    api: {
        globalPrefix: "api/v1";
        corsOrigin: string;
    };
}>;
export default _default;
