# Security Policy

This document covers the `@toqenapp/sdk` repository.

## Reporting a vulnerability

Report SDK or integration security concerns **privately** by email:

```
hi@toqen.app
```

Do not open a public GitHub issue for a vulnerability. If the report involves a sensitive detail about a production integration, describe the class of issue only until a private channel is established.

We aim to acknowledge reports within 3 business days.

---

## Scope

**In scope:**

- Unsafe SDK defaults or behaviors
- Incorrect CSRF state or PKCE validation logic
- Session JWT signing or verification issues
- Cookie flag misconfiguration (Secure, HttpOnly, SameSite)
- Credential or token exposure in SDK code or official examples
- Documentation that would lead an integrator to an insecure configuration

**Out of scope for this repository:**

- Toqen.app backend infrastructure, provider internals, or private endpoints
- Anti-abuse or rate-limiting implementation
- Database schemas or deployment topology
- Issues specific to a third-party integration (report to the relevant project)

---

## Known limitations

- The ID token payload returned by `callback()` is decoded but the JWT signature is not independently verified by the SDK. Token integrity relies on the authenticated, TLS-protected token endpoint response.
- Token revocation at the authorization server is not currently implemented in the logout flow.

---

## Supported versions

| Version | Status |
|---------|--------|
| `0.1.x` | In active development — fixes applied on main |

Pre-1.0 versions are subject to breaking changes. Security fixes are applied to the latest published version.
