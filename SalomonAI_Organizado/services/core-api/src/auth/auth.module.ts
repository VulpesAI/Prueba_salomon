import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    UserModule,
    FirebaseModule,
    SecurityModule,
    TypeOrmModule.forFeature([AuthToken]),
    PassportModule,
    ConfigModule,
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
  ],
  controllers: [AuthController, OAuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy, FirebaseAuthStrategy, TokenService, OAuthService],
  exports: [AuthService, TokenService],
})
export class AuthModule {}