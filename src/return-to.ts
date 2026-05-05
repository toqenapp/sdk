import { RETURN_TO_COOKIE_MAX_AGE, RETURN_TO_COOKIE_NAME } from './constants.js';
import { ensureServer } from './ensure-server.js';

ensureServer();

type ReturnToPayload = {
  returnTo: string;
  exp: number;
};

type SameSite = 'lax' | 'strict' | 'none';

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  path?: string;
  sameSite?: SameSite;
  maxAge?: number;
};

export type CreateReturnToCookieParams = {
  returnTo: string;
  secret: string;
  secure?: boolean;
  maxAge?: number;
};

export type ReadReturnToCookieParams = {
  cookieHeader: string | null | undefined;
  secret: string;
};

export type ConsumeReturnToCookieParams = ReadReturnToCookieParams & {
  secure?: boolean;
};

export type ConsumedReturnToCookie = {
  returnTo: string | null;
  clearCookie: string;
};

export async function createReturnToCookie({
  returnTo,
  secret,
  secure = true,
  maxAge = RETURN_TO_COOKIE_MAX_AGE,
}: CreateReturnToCookieParams): Promise<string> {
  const normalized = normalizeReturnTo(returnTo) ?? '/';
  const signed = await signReturnTo(normalized, secret, maxAge);

  return serializeCookie(RETURN_TO_COOKIE_NAME, signed, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export async function readReturnToCookie({
  cookieHeader,
  secret,
}: ReadReturnToCookieParams): Promise<string | null> {
  const signed = readCookie(cookieHeader, RETURN_TO_COOKIE_NAME);
  return verifyReturnTo(signed, secret);
}

export async function consumeReturnToCookie({
  cookieHeader,
  secret,
  secure = true,
}: ConsumeReturnToCookieParams): Promise<ConsumedReturnToCookie> {
  return {
    returnTo: await readReturnToCookie({ cookieHeader, secret }),
    clearCookie: clearReturnToCookie(secure),
  };
}

export function clearReturnToCookie(secure = true): string {
  return serializeCookie(RETURN_TO_COOKIE_NAME, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function normalizeReturnTo(input: string): string | null {
  if (!input) return null;
  if (!input.startsWith('/')) return null;
  if (input.startsWith('//')) return null;
  if (input.includes('\\')) return null;

  if (/[\u0000-\u001F\u007F]/.test(input)) return null;

  const hashIndex = input.indexOf('#');
  const normalized = hashIndex === -1 ? input : input.slice(0, hashIndex);

  return normalized || '/';
}

async function signReturnTo(
  returnTo: string,
  secret: string,
  ttlSec: number,
): Promise<string> {
  assertSecret(secret);

  const payload: ReturnToPayload = {
    returnTo,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };

  const encodedPayload = base64UrlEncodeString(JSON.stringify(payload));
  const signature = await hmacBase64Url(secret, encodedPayload);

  return `${encodedPayload}.${signature}`;
}

async function verifyReturnTo(
  signed: string | null,
  secret: string,
): Promise<string | null> {
  if (!signed) return null;

  assertSecret(secret);

  const parts = signed.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSignature] = parts;

  if (!encodedPayload || !providedSignature) return null;

  const expectedSignature = await hmacBase64Url(secret, encodedPayload);

  if (!constantTimeEqual(expectedSignature, providedSignature)) return null;

  let payload: ReturnToPayload;

  try {
    payload = JSON.parse(base64UrlDecodeToString(encodedPayload)) as ReturnToPayload;
  } catch {
    return null;
  }

  if (!payload || typeof payload.returnTo !== 'string') return null;
  if (typeof payload.exp !== 'number') return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

  const normalized = normalizeReturnTo(payload.returnTo);

  return normalized === payload.returnTo ? normalized : null;
}

async function hmacBase64Url(secret: string, value: string): Promise<string> {
  const crypto = getCrypto();

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );

  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);

  if (aBytes.length !== bBytes.length) return false;

  let diff = 0;

  for (let i = 0; i < aBytes.length; i += 1) {
    diff |= aBytes[i] ^ bBytes[i];
  }

  return diff === 0;
}

function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  parts.push(`Path=${options.path ?? '/'}`);

  if (typeof options.maxAge === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');

  const sameSite = options.sameSite ?? 'lax';
  parts.push(`SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}`);

  return parts.join('; ');
}

function readCookie(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split('=');

    if (rawName !== name) continue;

    try {
      return decodeURIComponent(rawValue.join('='));
    } catch {
      return null;
    }
  }

  return null;
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlDecodeToString(value: string): string {
  return new TextDecoder().decode(base64UrlDecodeToBytes(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return globalThis
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecodeToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  );
  const binary = globalThis.atob(padded);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function assertSecret(secret: string): void {
  if (!secret || secret.length < 32) {
    throw new Error('Toqen returnTo secret must be at least 32 characters long.');
  }
}

function getCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available in this runtime.');
  }

  return globalThis.crypto;
}
