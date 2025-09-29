import { IsOptional, IsString, IsUrl } from 'class-validator';

export class GoogleAuthorizationRequestDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUri?: string;
}

export class GoogleOAuthCallbackDto {
  @IsString()
  code: string;

  @IsString()
  codeVerifier: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUri?: string;

  @IsOptional()
  @IsString()
  state?: string;
}

