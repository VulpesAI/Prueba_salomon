"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoggerConfig = createLoggerConfig;
const winston = require("winston");
function createLoggerConfig(configService) {
    return {
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.printf(({ timestamp, level, message, context, trace }) => {
                    return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
                })),
            }),
            ...(configService.get('app.env') === 'production'
                ? [
                    new winston.transports.File({
                        filename: 'logs/error.log',
                        level: 'error',
                        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                    }),
                    new winston.transports.File({
                        filename: 'logs/combined.log',
                        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                    }),
                ]
                : []),
        ],
    };
}
//# sourceMappingURL=logger.config.js.map