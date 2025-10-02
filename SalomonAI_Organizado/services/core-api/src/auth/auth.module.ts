import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../users/user.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { FirebaseAuthStrategy } from './firebase-auth.strategy';
import { AuthToken } from './entities/auth-token.entity';
import { TokenService } from './token.service';
import { SecurityModule } from '../security/security.module';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { EnvProfile, EnvStrictnessMode } from '../config/env.validation';
import { TOKEN_STORE } from './token-store/token-store.interface';
import { TypeormTokenStore } from './token-store/typeorm-token.store';
import { InMemoryTokenStore } from './token-store/in-memory-token.store';

@Module({})
export class AuthModule {
  static register(options: { mode?: EnvStrictnessMode; profile?: EnvProfile } = {}): DynamicModule {
    const mode = options.mode ?? 'strict';
    const profile = options.profile ?? 'full';
    const isStrict = mode === 'strict';
    const isFirebaseEnabled = profile === 'full';

    const imports = [
      UserModule.register({ mode, profile }),
      FirebaseModule.register({ enabled: isFirebaseEnabled }),
      SecurityModule,
      PassportModule,
      ConfigModule,
      ...(isStrict ? [TypeOrmModule.forFeature([AuthToken])] : []),
      JwtModule.registerAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: (() => {
              const raw = Number(configService.get<string>('JWT_ACCESS_TOKEN_TTL_SECONDS', '900'));
              return Number.isNaN(raw) ? 900 : raw;
            })(),
          },
        }),
      }),
    ];

    const providers: Provider[] = [
      AuthService,
      JwtStrategy,
      LocalStrategy,
      FirebaseAuthStrategy,
      TokenService,
      OAuthService,
      {
        provide: TOKEN_STORE,
        useClass: isStrict ? TypeormTokenStore : InMemoryTokenStore,
      },
    ];

    return {
      module: AuthModule,
      imports,
      controllers: [AuthController, OAuthController],
      providers,
      exports: [AuthService, TokenService, TOKEN_STORE],
    };
  }
}