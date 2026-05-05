# @toqenapp/sdk

SDK for integrating Toqen.app authorization flows into server-side applications.

> **Source-available repository.** You may read and evaluate this code. Production or commercial use requires a separate written agreement with Toqen.app. See [LICENSE.md](./LICENSE.md).

---

## Requirements

- Node.js 18 or later, or any runtime that provides the Web Crypto API and `fetch`
- A registered Toqen.app client (client ID, client secret, and issuer URL)

---

## Installation

```bash
npm install @toqenapp/sdk
```

---

## Configuration

Create one instance per application, typically in a shared server-side module:

```typescript
import { createToqen } from '@toqenapp/sdk';

export const toqen = createToqen({
  clientId: process.env.TOQEN_CLIENT_ID!,
  clientSecret: process.env.TOQEN_CLIENT_SECRET!,
  issuerUrl: process.env.TOQEN_ISSUER_URL!,
  redirectUri: process.env.TOQEN_REDIRECT_URI!,
  sessionSecret: process.env.TOQEN_SESSION_SECRET!,
  logoutRedirectUri: process.env.TOQEN_LOGOUT_REDIRECT_URI!,
  sessionMaxDays: 30,
  isDevelopment: process.env.NODE_ENV !== 'production',
});
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `clientId` | `string` | Yes | OAuth 2.0 client ID |
| `clientSecret` | `string` | Yes | OAuth 2.0 client secret. Keep server-side only |
| `issuerUrl` | `string` | Yes | Toqen.app issuer base URL |
| `redirectUri` | `string` | Yes | Registered authorization callback URI |
| `sessionSecret` | `string` | Yes | Signs session JWTs and returnTo cookies. Use at least 32 random characters |
| `logoutRedirectUri` | `string` | Yes | Where to send the user after the provider ends the session |
| `uiLocales` | `string` | No | BCP 47 locale hint for the authorization UI, for example `en` or `fr` |
| `sessionMaxDays` | `number` | No | Session lifetime in days. Default: `30` |
| `isDevelopment` | `boolean` | No | Omits the `Secure` cookie flag when `true` |

---

## Auth Flow

### 1. Start Authorization

```typescript
// GET /auth/login
import { toqen } from '@/lib/toqen';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('returnTo') ?? '/';
  const { authorizationUrl, headers } = await toqen.start({ returnTo });

  headers.set('Location', authorizationUrl);
  return new Response(null, { status: 302, headers });
}
```


### 2. Handle The Callback

```typescript
// GET /auth/callback
import { toqen } from '@/lib/toqen';

export async function GET(context: ToqenCallbackContext) {
  const { session, returnTo } = await toqen.callback(context);
  const { headers } = await toqen.createSession(session, { returnTo });

  return new Response(null, { status: 302, headers });
}
```

`callback()` validates state and PKCE cookies, exchanges the authorization code for tokens, and reads the signed returnTo cookie if present. `createSession()` signs the session JWT, sets the session cookie, redirects to the verified relative return path or `/`, and clears the temporary auth cookies.

### 3. Read The Session

```typescript
import { parse } from 'cookie';
import { toqen } from '@/lib/toqen';

const cookieName = toqen.cookies.sessionName(!isDevelopment);
const cookieHeader = request.headers.get('cookie') ?? '';
const token = parse(cookieHeader)[cookieName] ?? '';

const session = await toqen.getSession(token);

if (!session) {
  return Response.redirect('/auth/login', 302);
}
```

### 4. Refresh Tokens

```typescript
if (session.refreshToken) {
  const newSession = await toqen.refresh(session);
  const url = new URL(request.url);
  const { headers } = await toqen.createSession(newSession, {
    returnTo: url.pathname + url.search,
  });
}
```

Concurrent refresh calls for the same user are deduplicated.

### 5. End The Session

```typescript
// GET /auth/logout
import { toqen } from '@/lib/toqen';

export async function GET() {
  return toqen.endSession();
}
```


## Cookies

The SDK manages these cookies on the server:

| Cookie | Purpose | Max-Age | Flags |
|--------|---------|---------|-------|
| `__toqen_state` | CSRF state during auth flow | 10 min | HttpOnly, SameSite=Lax |
| `__toqen_cv` | PKCE code verifier during auth flow | 10 min | HttpOnly, SameSite=Lax |
| `__toqen_return_to` | Signed relative post-login redirect path | 10 min | HttpOnly, SameSite=Lax, Secure in production |
| `__Secure-toqen-session` | Signed session JWT in production | configurable | HttpOnly, SameSite=Lax, Secure |
| `toqen-session` | Signed session JWT in development | configurable | HttpOnly, SameSite=Lax |

The returnTo cookie payload is base64url JSON with an expiration timestamp and an HMAC SHA-256 signature. Verification uses a constant-time comparison. Hash fragments are not preserved.

---

## Framework Context Shape

`callback()` accepts a value satisfying `ToqenCallbackContext`:

```typescript
type ToqenCallbackContext = {
  url: URL;
  request: { headers: { get(name: string): string | null } };
};
```

Astro `APIContext` satisfies this shape directly. For Next.js App Router, construct it from `NextRequest`:

```typescript
import type { NextRequest } from 'next/server';
import { toqen } from '@/lib/toqen';

export async function GET(request: NextRequest) {
  const context = {
    url: new URL(request.url),
    request: { headers: request.headers },
  };

  const { session, returnTo } = await toqen.callback(context);
  const { headers } = await toqen.createSession(session, { returnTo });

  return new Response(null, { status: 302, headers });
}
```

The SDK does not import Next.js `server-only`; keep `@toqenapp/sdk` imports in framework server files.

---

## Security Notes

- PKCE S256 verifier and CSRF state are generated per authorization request and stored in short-lived `HttpOnly` cookies.
- Session tokens are HMAC-SHA256 signed using `sessionSecret` and verified through the `jose` library.
- returnTo values are relative only. External URLs and protocol-relative URLs are rejected.
- ID token claims are decoded from the token endpoint response. The SDK does not independently verify the ID token signature.
- `clientSecret` and `sessionSecret` must not appear in client bundles, committed `.env` files, or public configuration.

---

## License

This repository is source-available. Reading and evaluating the code is permitted. Production and commercial use require a separate written agreement with Toqen.app.

Full terms: [LICENSE.md](./LICENSE.md)
Licensing inquiries: **hi@toqen.app**
