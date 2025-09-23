import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class FirebaseAuthStrategy extends PassportStrategy(Strategy, 'firebase-auth') {
  constructor(
    private firebaseAdminService: FirebaseAdminService,
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', 'fallback-secret'), // Usar fallback para Firebase
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    try {
      // Extraer el token del header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('No authorization header');
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Verificar el token con Firebase
      const decodedToken = await this.firebaseAdminService.verifyIdToken(token);
      
      // Buscar o crear el usuario en nuestra base de datos
      let user = await this.usersService.findByUid(decodedToken.uid);
      
      if (!user) {
        // Si el usuario no existe en nuestra BD, créalo usando datos de Firebase
        user = await this.usersService.createFromFirebase({
          uid: decodedToken.uid,
          email: decodedToken.email,
          displayName: decodedToken.name,
          photoURL: decodedToken.picture,
          emailVerified: decodedToken.email_verified,
          phoneNumber: decodedToken.phone_number,
        });
      }

      return {
        id: user.id,
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        roles: user.roles || ['user'],
      };
    } catch (error) {
      throw new UnauthorizedException(`Authentication failed: ${error.message}`);
    }
  }
}
