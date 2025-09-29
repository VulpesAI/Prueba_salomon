import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { GoogleAuthorizationRequestDto, GoogleOAuthCallbackDto } from './dto/google-oauth.dto';

@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Post('google/authorize')
  @HttpCode(HttpStatus.OK)
  generateGoogleAuthorization(@Body() dto: GoogleAuthorizationRequestDto) {
    return this.oauthService.generateGoogleAuthorizationUrl(dto.redirectUri);
  }

  @Post('google/callback')
  @HttpCode(HttpStatus.OK)
  async handleGoogleCallback(@Body() dto: GoogleOAuthCallbackDto) {
    return this.oauthService.handleGoogleCallback(dto);
  }
}

