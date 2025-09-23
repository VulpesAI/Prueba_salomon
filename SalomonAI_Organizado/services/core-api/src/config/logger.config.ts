import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';
import { WinstonModuleOptions } from 'nest-winston';

export function createLoggerConfig(configService: ConfigService): WinstonModuleOptions {
  return {
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, trace }) => {
            return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
          }),
        ),
      }),
      // Puedes agregar más transportes aquí según sea necesario
      // Por ejemplo, para producción:
      ...(configService.get('app.env') === 'production'
        ? [
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
            }),
          ]
        : []),
    ],
  };
}
