# SDK Integration Guide

This document covers integration patterns beyond what the README walkthrough includes.

## Route structure

A typical integration requires three server-side routes:

| Route | Handler | Purpose |
|-------|---------|---------|
| `GET /auth/login` | `toqen.start()` | Begins the authorization flow |
| `GET /auth/callback` | `toqen.callback()` + `toqen.createSession()` | Completes the flow, sets session |
| `GET /auth/logout` | `toqen.endSession()` | Clears the session cookie and ends the session at the provider |

All three routes are server-side only. No tokens or secrets should appear in client-side code or public URLs.

## Protecting routes

After creating a session, use `toqen.getSession(token)` in any server-side handler to validate the current request:

```typescript
const cookieName = toqen.cookies.sessionName(!isDevelopment);
const token      = parse(request.headers.get('cookie') ?? '')[cookieName] ?? '';
const session    = await toqen.getSession(token);

if (!session) {
  return Response.redirect('/auth/login', 302);
}
```

`getSession` returns `null` for absent, expired, or tampered tokens. It does not throw.

## Token refresh

Access tokens expire. Use `toqen.refresh()` when you need a fresh access token and a refresh token is present in the session:

```typescript
const session = await toqen.getSession(token);

if (session?.refreshToken && tokenNeedsRefresh(session)) {
  const newSession = await toqen.refresh(session);
  const { headers } = await toqen.createSession(newSession);
  // attach headers to the outgoing response
}
```

`refresh()` is safe to call from concurrent server requests for the same user — only one token exchange is made.

## Cookie names

The SDK uses different cookie names depending on the `isDevelopment` flag:

| Environment | Cookie name |
|-------------|-------------|
| Production (`isDevelopment: false`) | `__Secure-toqen-session` |
| Development (`isDevelopment: true`) | `toqen-session` |

Use `toqen.cookies.sessionName(isSecure)` to get the correct name at runtime without hardcoding it.

## Framework context shape

`callback()` requires an object satisfying `ToqenCallbackContext`:

```typescript
type ToqenCallbackContext = {
  url: URL;
  request: { headers: { get(name: string): string | null } };
};
```

Most server-side frameworks expose a compatible request context:

- **Astro** — `APIContext` satisfies this type directly.
- **Next.js App Router** — construct `{ url: new URL(request.url), request: { headers: request.headers } }` from `NextRequest`.
- **SvelteKit** — `RequestEvent` has `.url` and `.request` which satisfy this shape.
- **Hono / Elysia / other edge frameworks** — adapt `request.url` and `request.headers` similarly.

## Environment variables

Recommended names for the required configuration values:

```
TOQEN_CLIENT_ID
TOQEN_CLIENT_SECRET
TOQEN_ISSUER_URL
TOQEN_REDIRECT_URI
TOQEN_SESSION_SECRET
```

`TOQEN_CLIENT_SECRET` and `TOQEN_SESSION_SECRET` must not appear in client-side bundles or be committed to version control.

## Session secret strength

`sessionSecret` is used to sign session JWTs with HMAC-SHA256. Use a randomly generated string of at least 32 characters. A simple way to generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Rotate it if you need to invalidate all active sessions immediately (all existing tokens will fail verification).
