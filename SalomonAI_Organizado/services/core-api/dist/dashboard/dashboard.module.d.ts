import { DynamicModule } from '@nestjs/common';
export declare class DashboardModule {
    static register(options: {
        recommendationsEnabled: boolean;
    }): DynamicModule;
}
