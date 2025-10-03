import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { FirebaseAdminService } from './firebase-admin.service';
import { FirebaseLoginDto } from './dto/firebase-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async firebaseLogin({ token, idToken, id_token }: FirebaseLoginDto) {
    const firebaseToken = token ?? idToken ?? id_token;

    if (!this.firebaseAdminService.isEnabled()) {
      throw new ServiceUnavailableException('Firebase authentication is disabled');
    }

    if (typeof firebaseToken !== 'string' || firebaseToken.length < 10) {
      throw new BadRequestException('A valid Firebase token is required');
    }

    try {
      const decoded = await this.firebaseAdminService.verifyIdToken(firebaseToken);
      const payload = {
        sub: decoded.uid,
        email: decoded.email,
        name: decoded.name ?? decoded.email ?? decoded.uid,
        picture: decoded.picture,
        firebaseSignInProvider: decoded.firebase?.sign_in_provider
      };

      const jwtSecret = this.configService.get<string>('auth.jwtSecret');
      if (!jwtSecret) {
        throw new UnauthorizedException('JWT secret not configured');
      }

      const expiresIn = this.configService.get<string>('auth.jwtExpiresIn') ?? '1h';
      const accessToken = await this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn
      });

      return {
        token: accessToken,
        user: {
          uid: decoded.uid,
          email: decoded.email,
          name: decoded.name ?? decoded.email ?? decoded.uid,
          picture: decoded.picture
        }
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('Firebase Admin is disabled')) {
        throw new ServiceUnavailableException('Firebase authentication is disabled');
      }

      throw new UnauthorizedException('Invalid Firebase token', { cause: error as Error });
    }
  }
}
