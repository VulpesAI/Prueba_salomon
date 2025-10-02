import { DynamicModule } from '@nestjs/common';
export declare class KafkaModule {
    static register(options: {
        enabled: boolean;
    }): DynamicModule;
}
