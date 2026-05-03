import { SESSION_COOKIE_SECURE, SESSION_COOKIE_DEV, STATE_COOKIE_MAX_AGE, STATE_COOKIE_NAME } from './constants';
import { ToqenCallbackError, ToqenRefreshError } from './errors';
import type { ToqenConfig, ToqenSession, ToqenTokenResponse } from './types';

export function getSessionCookieName(isSecure: boolean): string {
  return isSecure ? SESSION_COOKIE_SECURE : SESSION_COOKIE_DEV;
}

export function serializeState(state: string): string {
  return `${STATE_COOKIE_NAME}=${state}; HttpOnly; SameSite=Lax; Max-Age=${STATE_COOKIE_MAX_AGE}; Path=/`;
}

export function clearCookie(name: string): string {
  return `${name}=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/`;
}

export function clearSessionCookie(secure: boolean): string {
  const name = getSessionCookieName(secure);
  return clearCookie(name);
}

export function serializeSessionCookie(
  name: string,
  token: string,
  maxAge: number,
  isSecure: boolean,
): string {
  let cookie = `${name}=${token}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Path=/`;
  if (isSecure) cookie += '; Secure';
  return cookie;
}

export function parseCookie(cookieHeader: string, name: string): string | null {
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    if (trimmed.slice(0, eq).trim() === name) {
      return trimmed.slice(eq + 1).trim();
    }
  }
  return null;
}


export async function standardTokenExchange(
  config: ToqenConfig,
  code: string,
  codeVerifier: string,
): Promise<ToqenTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  body.set('code_verifier', codeVerifier);

  const res = await fetch(`${config.issuerUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new ToqenCallbackError(
      `Token exchange failed ${res.status}: ${errText.slice(0, 200)}`,
    );
  }

  return res.json() as Promise<ToqenTokenResponse>;
}

export async function doRefresh(
  config: ToqenConfig,
  session: ToqenSession,
): Promise<ToqenSession> {
  if (!session.refreshToken) {
    throw new ToqenRefreshError('No refresh token available in session');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const res = await fetch(`${config.issuerUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new ToqenRefreshError(
      `Token refresh failed ${res.status}: ${errText.slice(0, 200)}`,
    );
  }

  const tokens = (await res.json()) as ToqenTokenResponse;

  return {
    sub: session.sub,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? session.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600),
  };
}
