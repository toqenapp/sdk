import { SignJWT, jwtVerify } from 'jose';
import { generatePkce, generateState } from './crypto.js';
import { clearCookie, doRefresh, getSessionCookieName, parseCookie, serializeSessionCookie, serializeState, standardTokenExchange } from './session.js';
import {
  CODE_VERIFIER_COOKIE_NAME,
  DEFAULT_SESSION_MAX_DAYS,
  STATE_COOKIE_NAME,
  TOKEN_SKEW_SECONDS,
} from './constants.js';
import {
  ToqenCallbackError,
  ToqenConfigError,
} from './errors.js';
import type {
  ToqenConfig,
  ToqenSession,
  ToqenCallbackContext,
  AuthStartResult,
  ToqenIdTokenClaims,
} from './types.js';

const refreshLocks = new Map<string, Promise<ToqenSession>>();

export async function startAuthFlow(config: ToqenConfig): Promise<AuthStartResult> {
  if (!config.issuerUrl) throw new ToqenConfigError('issuerUrl is required');
  if (!config.clientId) throw new ToqenConfigError('clientId is required');
  if (!config.redirectUri) throw new ToqenConfigError('redirectUri is required');

  const state = generateState();
  const { verifier, challenge } = await generatePkce();

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  if (config.uiLocales) params.set('ui_locales', config.uiLocales);

  const headers = new Headers({ 'Content-Type': 'application/json' });

  headers.append('Set-Cookie', serializeState(state));
  headers.append('Set-Cookie',
    `${CODE_VERIFIER_COOKIE_NAME}=${verifier}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/`
  );

  const authorizationUrl = `${config.issuerUrl}/auth?${params.toString()}`;

  return { authorizationUrl, headers };
}

export async function handleCallback(
  config: ToqenConfig,
  context: ToqenCallbackContext,
): Promise<{ session: ToqenSession; claims: ToqenIdTokenClaims }> {
  const state = context.url.searchParams.get('state') ?? '';
  const iss = context.url.searchParams.get('iss') ?? undefined;
  const code = context.url.searchParams.get('code');

  if (!code || !state || (iss && iss !== config.issuerUrl)) {
    throw new ToqenCallbackError('State mismatch — possible CSRF attack');
  }

  const cookieHeader = context.request.headers.get('cookie') ?? '';
  const expectedState = parseCookie(cookieHeader, STATE_COOKIE_NAME) ?? undefined;
  const codeVerifier = parseCookie(cookieHeader, CODE_VERIFIER_COOKIE_NAME) ?? undefined;

  if (!codeVerifier || !expectedState || state !== expectedState) {
    throw new ToqenCallbackError('Mismatch — possible CSRF attack');
  }

  const tokens = await standardTokenExchange(config, code, codeVerifier);

  const claims = decodeIdToken(tokens.id_token ?? '');

  const session: ToqenSession = {
    sub: claims.sub,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  };

  return { session, claims };
}

export async function refreshAccessToken(
  config: ToqenConfig,
  session: ToqenSession,
): Promise<ToqenSession> {
  const lockKey = session.sub;
  const existing = refreshLocks.get(lockKey);
  if (existing) return existing;

  const promise = doRefresh(config, session).finally(() => {
    refreshLocks.delete(lockKey);
  });

  refreshLocks.set(lockKey, promise);
  return promise;
}

export async function createSessionToken(
  config: ToqenConfig,
  session: ToqenSession,
): Promise<{headers: Headers}> {
  if (!config.sessionSecret) throw new ToqenConfigError('sessionSecret is required');

  const secret = new TextEncoder().encode(config.sessionSecret);
  const maxAge = (config.sessionMaxDays ?? DEFAULT_SESSION_MAX_DAYS) * 24 * 60 * 60;
  const isSecure = !config.isDevelopment;

  const customClaims: Record<string, unknown> = {};
  if (session.accessToken) customClaims.at = session.accessToken;
  if (session.refreshToken) customClaims.rt = session.refreshToken;

  const token = await new SignJWT(customClaims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .setSubject(session.sub)
    .sign(secret);

  const cookieName = getSessionCookieName(isSecure);
  const cookie = serializeSessionCookie(cookieName,token, maxAge, isSecure);

  const headers = new Headers({ Location: config.returnUri || '/', 'Set-Cookie': cookie });

  headers.append('Set-Cookie', clearCookie(STATE_COOKIE_NAME));
  headers.append('Set-Cookie', clearCookie(CODE_VERIFIER_COOKIE_NAME));

  return { headers };
}

export async function verifySessionToken(
  config: ToqenConfig,
  token: string,
): Promise<ToqenSession | null> {
  if (!config.sessionSecret || !token) return null;
  try {
    const secret = new TextEncoder().encode(config.sessionSecret);
    const { payload } = await jwtVerify(token, secret, {
      clockTolerance: TOKEN_SKEW_SECONDS,
    });

    const sub = payload.sub;
    if (!sub) return null;



    return {
      sub,
      accessToken: typeof payload.at === 'string' ? payload.at : undefined,
      refreshToken: typeof payload.rt === 'string' ? payload.rt : undefined,
    };
  } catch {
    return null;
  }
}

export async function getSessionToken(
    config: ToqenConfig,
    token: string,
): Promise<ToqenSession | null> {
  if (!token) return null;
  return verifySessionToken(config, token);
}

export function decodeIdToken(idToken: string): ToqenIdTokenClaims {
  if (!idToken) return { sub: '', iat: 0, exp: 0 };
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new ToqenCallbackError('Invalid ID token format');
  const payload = parts[1];
  if (!payload) throw new ToqenCallbackError('Missing ID token payload');
  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedWithEquals = padded.padEnd(padded.length + (4 - (padded.length % 4)) % 4, '=');
    const decoded = atob(paddedWithEquals);
    return JSON.parse(decoded) as ToqenIdTokenClaims;
  } catch {
    throw new ToqenCallbackError('Failed to decode ID token payload');
  }
}
