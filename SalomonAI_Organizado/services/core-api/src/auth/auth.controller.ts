import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { DisableMfaDto } from './dto/disable-mfa.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async login(@Request() req, @Body() _loginDto: LoginUserDto) {
    return this.authService.login(req.user);
  }

  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  async setupMfa(@Request() req) {
    return this.authService.initiateMfaEnrollment(req.user.id);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  async verifyMfa(@Request() req, @Body() dto: VerifyMfaDto) {
    return this.authService.verifyMfaEnrollment(req.user.id, dto.token);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  async disableMfa(@Request() req, @Body() dto: DisableMfaDto) {
    await this.authService.disableMfa(req.user.id, dto.token, dto.backupCode);
    return { message: 'MFA desactivado correctamente' };
  }

  /**
   * Login con Firebase Token
   */
  @Post('firebase/login')
  @HttpCode(HttpStatus.OK)
  async firebaseLogin(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token Firebase requerido');
    }

    const firebaseToken = authHeader.substring(7); // Remover "Bearer "

    try {
      // Verificar el token con Firebase Admin
      const decodedToken = await this.firebaseAdminService.verifyIdToken(firebaseToken);
      
      // Obtener información del usuario de Firebase
      const firebaseUser = await this.firebaseAdminService.getUserByUid(decodedToken.uid);
      
      // Sincronizar o crear usuario en nuestra base de datos
      const user = await this.usersService.syncWithFirebase({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified,
        phoneNumber: firebaseUser.phoneNumber,
        metadata: {
          creationTime: firebaseUser.metadata.creationTime,
          lastSignInTime: firebaseUser.metadata.lastSignInTime,
        },
      });

      // Generar JWT interno para nuestra aplicación
      const session = await this.authService.login({
        id: user.id,
        email: user.email,
        roles: user.roles,
        mfaEnabled: user.mfaEnabled,
        isActive: user.isActive,
        uid: user.uid,
      });

      return {
        ...session,
        access_token: session.accessToken,
      };
    } catch (error) {
      console.error('Error en login Firebase:', error);
      throw new UnauthorizedException('Token Firebase inválido');
    }
  }

  /**
   * Verificar token Firebase
   */
  @Post('firebase/verify')
  @HttpCode(HttpStatus.OK)
  async verifyFirebaseToken(@Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token Firebase requerido');
    }

    const firebaseToken = authHeader.substring(7);

    try {
      const decodedToken = await this.firebaseAdminService.verifyIdToken(firebaseToken);
      const user = await this.usersService.findByUid(decodedToken.uid);

      return {
        valid: true,
        uid: decodedToken.uid,
        user: user
          ? {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              emailVerified: user.emailVerified,
              roles: user.roles,
            }
          : null,
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Token inválido',
      };
    }
  }
}