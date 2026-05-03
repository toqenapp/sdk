/** Default session lifetime: 30 days in seconds */
export const DEFAULT_SESSION_MAX_DAYS = 30;

/** Clock skew tolerance for JWT verification */
export const TOKEN_SKEW_SECONDS = 30;

/** Cookie name used to store the CSRF state during auth flow */
export const STATE_COOKIE_NAME = '__toqen_state';

export const CODE_VERIFIER_COOKIE_NAME = '__toqen_cv';

/** Max age for the state cookie: 10 minutes */
export const STATE_COOKIE_MAX_AGE = 600;

/** Session cookie name (production — requires Secure) */
export const SESSION_COOKIE_SECURE = '__Secure-toqen-session';

/** Session cookie name (development) */
export const SESSION_COOKIE_DEV = 'toqen-session';
