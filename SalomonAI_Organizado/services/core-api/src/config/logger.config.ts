import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';
import { WinstonModuleOptions } from 'nest-winston';
import { mkdirSync } from 'fs';

export function createLoggerConfig(configService: ConfigService): WinstonModuleOptions {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context, trace }) => {
          return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
        }),
      ),
    }),
  ];

  if (configService.get('app.env') === 'production') {
    try {
      mkdirSync('logs', { recursive: true });
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        })
      );
    } catch (error) {
      console.warn('Failed to initialize file logging. Falling back to console transport only.', error);
    }
  }

  return {
    transports,
  };
}
