import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

type JwtPayload = Record<string, unknown>;

export interface AuthenticatedUser {
  id: string;
  token: string;
  payload: JwtPayload;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authorization token is missing');
    }

    try {
      const secret = this.configService.get<string>('auth.jwtSecret', { infer: true });

      if (!secret) {
        this.logger.error('Supabase JWT secret is not configured.');
        throw new UnauthorizedException('Authentication is not configured properly');
      }

      const audienceConfig = this.configService.get<string>('supabase.jwtAudience', {
        infer: true,
      });
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
        audience: audienceConfig ?? undefined,
      });

      const userId = this.extractUserId(payload);
      if (!userId) {
        throw new UnauthorizedException('Token is missing required claims');
      }

      request.user = { id: userId, token, payload };
      this.applyUserScope(request, userId);

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to authenticate request: ${message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: Request): string | null {
    const authorization = request.headers['authorization'] ?? request.headers['Authorization'];

    if (typeof authorization === 'string') {
      const [scheme, value] = authorization.split(' ');
      if (scheme?.toLowerCase() === 'bearer' && value?.trim()) {
        return value.trim();
      }
    }

    if (Array.isArray(authorization)) {
      for (const header of authorization) {
        if (typeof header !== 'string') {
          continue;
        }

        if (header.toLowerCase().startsWith('bearer ')) {
          const value = header.slice(7).trim();
          if (value.length > 0) {
            return value;
          }
        }
      }
    }

    const cookies = (request as Request & { cookies?: Record<string, unknown> }).cookies;
    const token =
      cookies && typeof cookies === 'object'
        ? (cookies['access_token'] as string | undefined)
        : undefined;

    if (typeof token === 'string' && token.trim().length > 0) {
      return token.trim();
    }

    return null;
  }

  private extractUserId(payload: JwtPayload): string | null {
    const candidates = [payload['sub'], payload['user_id'], payload['userId']];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }
    return null;
  }

  private applyUserScope(request: Request, userId: string): void {
    (request as Request & { userId?: string; supabaseUserId?: string }).userId = userId;
    (request as Request & { supabaseUserId?: string }).supabaseUserId = userId;

    this.assignUserId((request as Request & { body?: unknown }).body, userId);
    this.assignUserId((request as Request & { query?: unknown }).query, userId);
    this.assignUserId((request as Request & { params?: unknown }).params, userId);
  }

  private assignUserId(target: unknown, userId: string): void {
    if (!target || typeof target !== 'object') {
      return;
    }

    const container = target as Record<string, unknown>;
    container.userId = userId;

    if ('user_id' in container) {
      container.user_id = userId;
    }
  }
}
