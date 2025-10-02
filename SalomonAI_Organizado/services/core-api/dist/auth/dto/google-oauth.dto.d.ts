export declare class GoogleAuthorizationRequestDto {
    redirectUri?: string;
}
export declare class GoogleOAuthCallbackDto {
    code: string;
    codeVerifier: string;
    redirectUri?: string;
    state: string;
}
