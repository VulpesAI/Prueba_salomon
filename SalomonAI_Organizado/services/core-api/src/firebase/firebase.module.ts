import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseAdminService } from './firebase-admin.service';
import { NoopFirebaseAdminService } from './noop-firebase-admin.service';
import { FIREBASE_ADMIN_SERVICE } from './firebase-admin.interface';

@Global()
@Module({})
export class FirebaseModule {
  static register(options: { enabled: boolean }): DynamicModule {
    const providers: Provider[] = options.enabled
      ? [
          FirebaseAdminService,
          {
            provide: FIREBASE_ADMIN_SERVICE,
            useExisting: FirebaseAdminService,
          },
        ]
      : [
          NoopFirebaseAdminService,
          {
            provide: FirebaseAdminService,
            useExisting: NoopFirebaseAdminService,
          },
          {
            provide: FIREBASE_ADMIN_SERVICE,
            useExisting: NoopFirebaseAdminService,
          },
        ];

    return {
      module: FirebaseModule,
      imports: [ConfigModule],
      providers,
      exports: [FirebaseAdminService, FIREBASE_ADMIN_SERVICE],
    };
  }
}
