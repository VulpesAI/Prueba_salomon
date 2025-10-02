import { DynamicModule } from '@nestjs/common';
import { EnvStrictnessMode } from '../config/env.validation';
export declare class AuthModule {
    static register(options: {
        mode: EnvStrictnessMode;
    }): DynamicModule;
}
