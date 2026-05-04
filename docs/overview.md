# SDK Overview

`@toqenapp/sdk` is a server-side TypeScript SDK for integrating Toqen.app authorization into web applications.

## What the SDK does

The SDK covers three server-side steps of the authorization flow:

1. **Start** — generates a PKCE S256 code challenge and CSRF state, sets short-lived `HttpOnly` cookies, and returns the authorization URL to redirect to.
2. **Callback** — validates the returned state and PKCE verifier, exchanges the authorization code for tokens, and returns a session and decoded ID token claims.
3. **Session** — signs a session JWT with HMAC-SHA256, serializes it as an `HttpOnly` cookie, and clears the temporary flow cookies.

The SDK also provides helpers for reading the session on subsequent requests, refreshing tokens, and ending the session (both locally and at the provider) on logout.

## What the SDK does not do

- The ID token's cryptographic signature is not independently verified. Token integrity relies on the TLS-protected token endpoint response.
- Token revocation at the authorization server is not explicitly requested during logout — the SDK ends the session via the OIDC end-session endpoint, which is sufficient for most providers.
- The SDK does not include client-side components.

## Package

```
@toqenapp/sdk
```

Requires Node.js 18 or later, or any runtime with the Web Crypto API and `fetch`.

## Security model

- PKCE (S256) per RFC 7636
- CSRF state bound to a short-lived `HttpOnly` session cookie
- Session tokens signed with HMAC-SHA256 via the `jose` library
- All sensitive cookies use `HttpOnly` and `SameSite=Lax`; production cookies add `Secure`

## Further reading

- [README.md](../README.md) — installation, configuration, and usage examples
- [SECURITY.md](../SECURITY.md) — scope, known limitations, and how to report issues
- [LICENSE.md](../LICENSE.md) — source-available license terms
