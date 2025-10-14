import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const SUPABASE_PROJECT = process.env.SUPABASE_PROJECT_REF!;
const JWKS = createRemoteJWKSet(
  new URL(`https://${SUPABASE_PROJECT}.supabase.co/auth/v1/.well-known/jwks.json`),
);

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const raw = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!raw) throw new UnauthorizedException('Missing token');
    try {
      const { payload } = await jwtVerify(raw, JWKS);
      if (!payload?.sub) throw new UnauthorizedException('Invalid token (no sub)');
      req.user = { sub: String(payload.sub) };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
