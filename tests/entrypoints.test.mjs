import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ToqenCallbackError,
  ToqenConfigError,
  ToqenError,
  ToqenRefreshError,
  ToqenSessionError,
  createToqen,
} from '../dist/index.js';
import {
  clearReturnToCookie,
  createReturnToCookie,
  normalizeReturnTo,
  readReturnToCookie,
} from '../dist/return-to.js';

const secret = '0123456789abcdef0123456789abcdef';

test('root entrypoint exports the public server SDK', () => {
  assert.equal(typeof createToqen, 'function');
  assert.equal(typeof ToqenError, 'function');
  assert.equal(typeof ToqenCallbackError, 'function');
  assert.equal(typeof ToqenConfigError, 'function');
  assert.equal(typeof ToqenRefreshError, 'function');
  assert.equal(typeof ToqenSessionError, 'function');
});

test('createToqen exposes auth, session, refresh, logout, and cookie helpers', () => {
  const toqen = createToqen({
    clientId: 'client-id',
    clientSecret: secret,
    issuerUrl: 'https://issuer.example',
    redirectUri: 'https://app.example/auth/callback',
    sessionSecret: secret,
    logoutRedirectUri: 'https://app.example/',
    isDevelopment: true,
  });

  assert.equal(typeof toqen.start, 'function');
  assert.equal(typeof toqen.callback, 'function');
  assert.equal(typeof toqen.createSession, 'function');
  assert.equal(typeof toqen.getSession, 'function');
  assert.equal(typeof toqen.refresh, 'function');
  assert.equal(typeof toqen.endSession, 'function');
  assert.equal(toqen.cookies.sessionName(true), '__Secure-toqen-session');
  assert.equal(toqen.cookies.sessionName(false), 'toqen-session');
});

test('returnTo accepts relative paths and strips hash fragments', () => {
  assert.equal(normalizeReturnTo('/dashboard?tab=billing#private'), '/dashboard?tab=billing');
  assert.equal(normalizeReturnTo('/'), '/');
});

test('returnTo rejects external and protocol-relative URLs', () => {
  assert.equal(normalizeReturnTo('https://example.com/dashboard'), null);
  assert.equal(normalizeReturnTo('//example.com/dashboard'), null);
});

test('returnTo rejects control characters and backslashes', () => {
  assert.equal(normalizeReturnTo('/dashboard\r\nSet-Cookie:bad=true'), null);
  assert.equal(normalizeReturnTo('/admin\\settings'), null);
});

test('signed returnTo cookie round-trips and uses httpOnly flags', async () => {
  const cookie = await createReturnToCookie({
    returnTo: '/dashboard?tab=billing#private',
    secret,
    secure: false,
  });

  assert.match(cookie, /^__toqen_return_to=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Max-Age=600/);

  const returnTo = await readReturnToCookie({
    cookieHeader: cookieHeaderFromSetCookie(cookie),
    secret,
  });

  assert.equal(returnTo, '/dashboard?tab=billing');
});

test('expired returnTo returns null', async () => {
  const cookie = await createReturnToCookie({
    returnTo: '/expired',
    secret,
    secure: false,
    maxAge: -60,
  });

  const returnTo = await readReturnToCookie({
    cookieHeader: cookieHeaderFromSetCookie(cookie),
    secret,
  });

  assert.equal(returnTo, null);
});

test('tampered returnTo signature returns null', async () => {
  const cookie = await createReturnToCookie({
    returnTo: '/settings',
    secret,
    secure: false,
  });
  const value = cookieValueFromSetCookie(cookie);
  const [payload, signature] = value.split('.');
  const replacement = signature.endsWith('A') ? 'B' : 'A';
  const tampered = `${payload}.${signature.slice(0, -1)}${replacement}`;

  const returnTo = await readReturnToCookie({
    cookieHeader: `${cookieNameFromSetCookie(cookie)}=${encodeURIComponent(tampered)}`,
    secret,
  });

  assert.equal(returnTo, null);
});

test('clear returnTo cookie expires the httpOnly cookie', () => {
  assert.equal(
    clearReturnToCookie(false),
    '__toqen_return_to=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
  );
});

function cookieHeaderFromSetCookie(setCookie) {
  return setCookie.split(';')[0];
}

function cookieNameFromSetCookie(setCookie) {
  return cookieHeaderFromSetCookie(setCookie).split('=')[0];
}

function cookieValueFromSetCookie(setCookie) {
  const header = cookieHeaderFromSetCookie(setCookie);
  const equalsIndex = header.indexOf('=');

  return decodeURIComponent(header.slice(equalsIndex + 1));
}
