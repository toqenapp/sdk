export type ToqenConfig = {
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  redirectUri: string;
  sessionSecret: string;
  logoutRedirectUri: string;
  uiLocales?: string;
  sessionMaxDays?: number;
  isDevelopment?: boolean;
};

export type ToqenStartOptions = {
  uiLocales?: string;
  returnTo?: string;
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

export type ToqenCallbackResult = {
  session: ToqenSession;
  claims: ToqenIdTokenClaims;
  returnTo: string | null;
};

export type CreateSessionOptions = {
  returnTo?: string | null;
};

export type ToqenIdTokenClaims = {
  sub: string;
  email?: string;
  name?: string;
  iat: number;
  exp: number;
};

export type ToqenInstance = {
  start: (options?: ToqenStartOptions) => Promise<AuthStartResult>;
  callback: (context: ToqenCallbackContext) => Promise<ToqenCallbackResult>;
  createSession: (
    session: ToqenSession,
    options?: CreateSessionOptions,
  ) => Promise<{ headers: Headers }>;
  getSession: (token: string) => Promise<ToqenSession | null>;
  refresh: (session: ToqenSession) => Promise<ToqenSession>;
  endSession: () => Response;
  cookies: {
    sessionName: (isSecure: boolean) => string;
  };
};
