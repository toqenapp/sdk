# @toqenapp/sdk

SDK for integrating Toqen.app authorization flows into server-side applications.

> **Source-available repository.** You may read and evaluate this code. Production or commercial use requires a separate written agreement with Toqen.app. See [LICENSE.md](./LICENSE.md).

---

## Status

`0.1.0` — in active development. The public API may change before a stable release.

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

const toqen = createToqen({
  clientId:       process.env.TOQEN_CLIENT_ID!,
  clientSecret:   process.env.TOQEN_CLIENT_SECRET!,
  issuerUrl:      process.env.TOQEN_ISSUER_URL!,
  redirectUri:    process.env.TOQEN_REDIRECT_URI!,
  sessionSecret:  process.env.TOQEN_SESSION_SECRET!,
  returnUri:      '/dashboard',
  sessionMaxDays: 30,
  isDevelopment:  process.env.NODE_ENV !== 'production',
});
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `clientId` | `string` | Yes | OAuth 2.0 client ID |
| `clientSecret` | `string` | Yes | OAuth 2.0 client secret — keep server-side only |
| `issuerUrl` | `string` | Yes | Toqen.app issuer base URL |
| `redirectUri` | `string` | Yes | Registered authorization callback URI |
| `sessionSecret` | `string` | Yes | Signs session JWTs. Minimum 32 random characters recommended |
| `uiLocales` | `string` | No | BCP 47 locale hint for the authorization UI (e.g. `en`, `fr`) |
| `returnUri` | `string` | No | Redirect target after session creation. Default: `/` |
| `sessionMaxDays` | `number` | No | Session lifetime in days. Default: `30` |
| `isDevelopment` | `boolean` | No | Omits the `Secure` cookie flag when `true` |

---

## Auth flow

The authorization flow runs entirely in server-side route handlers across three steps.

### 1. Start authorization

```typescript
// GET /auth/login
import { toqen } from '@/lib/toqen';

export async function GET() {
  const { authorizationUrl, headers } = await toqen.start();
  headers.set('Location', authorizationUrl);
  return new Response(null, { status: 302, headers });
}
```

`start()` generates a PKCE S256 code challenge and a cryptographically random CSRF state value. Both are written into short-lived `HttpOnly` cookies included in the returned `headers`. You do not need to manage PKCE or state manually.

To pass a per-request locale override:

```typescript
const { authorizationUrl, headers } = await toqen.start({ uiLocales: 'fr' });
```

### 2. Handle the callback

```typescript
// GET /auth/callback
export async function GET(context: ToqenCallbackContext) {
  const { session, claims } = await toqen.callback(context);
  const { headers } = await toqen.createSession(session);
  return new Response(null, { status: 302, headers });
}
```

`callback()` reads the state and PKCE verifier from the incoming cookies, validates both, then exchanges the authorization code for tokens. `createSession()` signs a session JWT and returns `headers` containing a `Location` redirect, the session cookie, and directives to clear the temporary flow cookies.

> **ID token note:** The `claims` object contains the decoded payload of the ID token (sub, email, name, iat, exp). The payload is decoded from the token received over the TLS-protected token endpoint. The ID token's cryptographic signature is not independently verified by the SDK — token integrity relies on the authenticated token endpoint response.

### 3. Read the session

```typescript
import { parse } from 'cookie'; // or your framework's cookie utility

const cookieName   = toqen.cookies.sessionName(!isDevelopment);
const cookieHeader = request.headers.get('cookie') ?? '';
const token        = parse(cookieHeader)[cookieName] ?? '';

const session = await toqen.getSession(token);

if (!session) {
  // token absent, expired, or invalid
}

// session.sub          — user identifier
// session.accessToken  — current access token (if stored)
// session.refreshToken — refresh token (if present)
```

### 4. Refresh tokens

```typescript
if (session?.refreshToken) {
  const newSession = await toqen.refresh(session);
  const { headers } = await toqen.createSession(newSession);
  // apply headers to the outgoing response to update the session cookie
}
```

Concurrent refresh calls for the same user are deduplicated — a single token request is made even when parallel server requests arrive simultaneously.

### 5. End the session

```typescript
// GET /auth/logout
export async function GET() {
  const clearCookie = toqen.cookies.clearSession(!isDevelopment);
  return new Response(null, {
    status: 302,
    headers: { Location: '/', 'Set-Cookie': clearCookie },
  });
}
```

This clears the session cookie from the browser. Token revocation at the authorization server is not part of the current SDK.

---

## Session and cookie handling

The SDK manages these cookies automatically across the auth flow:

| Cookie | Purpose | Max-Age | Flags |
|--------|---------|---------|-------|
| `__toqen_state` | CSRF state (auth flow only) | 10 min | HttpOnly, SameSite=Lax |
| `__toqen_cv` | PKCE code verifier (auth flow only) | 10 min | HttpOnly, SameSite=Lax |
| `__Secure-toqen-session` | Signed session JWT (production) | configurable | HttpOnly, SameSite=Lax, Secure |
| `toqen-session` | Signed session JWT (development) | configurable | HttpOnly, SameSite=Lax |

Flow cookies are set by `start()` and cleared automatically when `createSession()` runs at the end of the callback. There is no step where you need to copy, forward, or manually clear them between the two route handlers.

---

## Framework integration

`callback()` accepts any value satisfying `ToqenCallbackContext`:

```typescript
type ToqenCallbackContext = {
  url: URL;
  request: { headers: { get(name: string): string | null } };
};
```

### Astro

Astro's `APIContext` satisfies `ToqenCallbackContext` directly — pass it without modification:

```typescript
// src/pages/api/auth/callback.ts
import type { APIContext } from 'astro';
import { toqen } from '@/lib/toqen';

export async function GET(context: APIContext) {
  const { session } = await toqen.callback(context);
  const { headers } = await toqen.createSession(session);
  return new Response(null, { status: 302, headers });
}
```

### Next.js (App Router)

Construct the context from the incoming `NextRequest`:

```typescript
// app/api/auth/callback/route.ts
import type { NextRequest } from 'next/server';
import { toqen } from '@/lib/toqen';

export async function GET(request: NextRequest) {
  const context = {
    url:     new URL(request.url),
    request: { headers: request.headers },
  };
  const { session } = await toqen.callback(context);
  const { headers } = await toqen.createSession(session);
  return new Response(null, { status: 302, headers });
}
```

---

## Security notes

- **PKCE (S256):** A fresh code verifier and challenge are generated per authorization request. The verifier is stored in a `HttpOnly` cookie and validated before any token exchange occurs.
- **CSRF protection:** A cryptographically random state value is bound to the browser session via cookie and verified on return. If the state cookie is absent or mismatched, the callback throws before any code exchange.
- **Session integrity:** Session tokens are HMAC-SHA256 signed using `sessionSecret` and verified on every `getSession()` call via the `jose` library.
- **ID token claims:** The claims returned by `callback()` are decoded from the ID token received from the token endpoint over HTTPS. The JWT signature is not independently verified by the SDK. Avoid using raw claims as the sole basis for high-assurance authorization decisions.
- **Secret handling:** `clientSecret` and `sessionSecret` are server-side values. They must not appear in client bundles, `.env` files committed to version control, or public configuration.
- **Runtime:** The SDK requires the Web Crypto API (`crypto.subtle`). Node.js 18+, Deno, Bun, and Cloudflare Workers are supported.

The SDK's PKCE implementation and cookie handling follow standard OAuth 2.0 PKCE practices (RFC 7636).

---

## License

This repository is source-available. Reading and evaluating the code is permitted. Production and commercial use require a separate written agreement with Toqen.app.

Full terms: [LICENSE.md](./LICENSE.md)  
Licensing inquiries: **hi@toqen.app**
