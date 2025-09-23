"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configModuleOptions = void 0;
const configuration_1 = require("./configuration");
const Joi = require("joi");
exports.configModuleOptions = {
    load: [configuration_1.default],
    validationSchema: Joi.object({
        NODE_ENV: Joi.string()
            .valid('development', 'production', 'test')
            .default('development'),
        PORT: Joi.number().default(3000),
        POSTGRES_HOST: Joi.string().default('postgres'),
        POSTGRES_PORT: Joi.number().default(5432),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().default('24h'),
        KAFKA_BROKER: Joi.string().default('kafka:9092'),
        KAFKA_CLIENT_ID: Joi.string().default('salomon-api'),
        QDRANT_URL: Joi.string().default('http://qdrant:6333'),
        QDRANT_COLLECTION: Joi.string().default('transactions'),
        FRONTEND_URL: Joi.string().default('http://localhost:3001'),
    }),
    validationOptions: {
        allowUnknown: true,
        abortEarly: false,
    },
    isGlobal: true,
    cache: true,
};
//# sourceMappingURL=config.module-options.js.map