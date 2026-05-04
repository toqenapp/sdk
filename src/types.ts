export type ToqenConfig = {
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  redirectUri: string;
  sessionSecret: string;
  uiLocales?: string;
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

export type ToqenCallbackContext = {
  url: URL;
  request: { headers: { get(name: string): string | null } };
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
  start: (overrides?: Partial<ToqenConfig>) => Promise<AuthStartResult>;
  callback: (context: ToqenCallbackContext) => Promise<{ session: ToqenSession; claims: ToqenIdTokenClaims }>;
  createSession: (session: ToqenSession) => Promise<{ headers: Headers }>;
  getSession: (token: string) => Promise<ToqenSession | null>;
  refresh: (session: ToqenSession) => Promise<ToqenSession>;
  cookies: {
    sessionName: (isSecure: boolean) => string;
    clearSession: (secure: boolean) => string;
  };
};
