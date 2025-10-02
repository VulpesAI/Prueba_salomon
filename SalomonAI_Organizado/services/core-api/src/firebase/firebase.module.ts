import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseAdminService } from './firebase-admin.service';
import { NoopFirebaseAdminService } from './noop-firebase-admin.service';

@Module({})
export class FirebaseModule {
  static register(options: { enabled: boolean }): DynamicModule {
    const providers = options.enabled
      ? [FirebaseAdminService]
      : [
          NoopFirebaseAdminService,
          {
            provide: FirebaseAdminService,
            useExisting: NoopFirebaseAdminService,
          },
        ];

    return {
      module: FirebaseModule,
      imports: [ConfigModule],
      providers,
      exports: [FirebaseAdminService],
    };
  }
}
