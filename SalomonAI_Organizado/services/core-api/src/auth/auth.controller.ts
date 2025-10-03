import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { FirebaseLoginDto } from './dto/firebase-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('firebase-login')
  firebaseLogin(@Body() body: FirebaseLoginDto) {
    return this.authService.firebaseLogin(body);
  }
}
