import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { SupabaseService } from './supabase.service';
import { SupabaseLoginDto } from './dto/supabase-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async supabaseLogin({ access_token }: SupabaseLoginDto) {
    if (!this.supabaseService.isEnabled()) {
      throw new ServiceUnavailableException('Supabase authentication is disabled');
    }

    if (typeof access_token !== 'string' || access_token.length < 10) {
      throw new BadRequestException('A valid Supabase access token is required');
    }

    const user = await this.supabaseService.getUser(access_token);

    if (!user) {
      throw new UnauthorizedException('Invalid Supabase access token');
    }

    const expectedAudience = this.configService.get<string>('supabase.jwtAudience');
    if (expectedAudience && user.aud !== expectedAudience) {
      throw new UnauthorizedException('Invalid Supabase token audience');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? user.id,
      picture: user.user_metadata?.avatar_url as string | undefined,
      provider: user.app_metadata?.provider
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
        id: user.id,
        email: user.email,
        name: payload.name,
        picture: payload.picture
      }
    };
  }
}
