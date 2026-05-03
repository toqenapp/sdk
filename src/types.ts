import type { APIContext } from "node_modules/astro/dist/types/public/context";

export type ToqenConfig = {
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  redirectUri: string;
  sessionSecret: string;
  uiLocales: string;
  sessionMaxDays?: number;
  returnUri?: string;
  isDevelopment?: boolean;
};

export type ToqenSession = {
  sub: string;
  accessToken?: string;
  refreshToken?: string;
  isNewUser?: boolean;
  expiresAt?: number;
};

export type ToqenTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
};

export type ToqenCallbackParams = {
  request: Request;
  code: string;
  state: string;
  iss?: string;
};

export type AuthStartResult = {
  authorizationUrl: string;
  headers: Headers;
};

export type ToqenIdTokenClaims = {
  sub: string;
  email?: string;
  name?: string;
  iat: number;
  exp: number;
};

export type ToqenInstance = {
  start: (overrides: { uiLocales: string }) => Promise<AuthStartResult>
  callback: (context: Record<string, any>) => Promise<{ session: ToqenSession; claims: ToqenIdTokenClaims }>
  createSession: (session: ToqenSession) => Promise<{headers: Headers}>
  getSession: (token: string) => Promise<ToqenSession | null>
  refresh: (session: ToqenSession) => Promise<ToqenSession>
  cookies: {
    sessionName: (isSecure: boolean) => string
    clearSession: (secure: boolean) => string
  }
}
