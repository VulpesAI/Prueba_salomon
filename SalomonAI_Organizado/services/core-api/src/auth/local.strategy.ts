import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email', passReqToCallback: true }); // Le decimos a Passport que use 'email'
  }

  async validate(req: Request, email: string, password: string): Promise<any> {
    const token = (req.body?.totp as string) ?? (req.body?.token as string) ?? (req.body?.mfaToken as string);
    const user = await this.authService.validateUser(email, password, token);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }
    return user;
  }
}