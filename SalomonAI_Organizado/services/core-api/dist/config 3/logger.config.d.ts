import { ConfigService } from '@nestjs/config';
import { WinstonModuleOptions } from 'nest-winston';
export declare function createLoggerConfig(configService: ConfigService): WinstonModuleOptions;
