import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { SupabaseLoginDto } from './dto/supabase-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('supabase-login')
  supabaseLogin(@Body() body: SupabaseLoginDto) {
    return this.authService.supabaseLogin(body);
  }
}
