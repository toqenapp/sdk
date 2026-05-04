import {
  startAuthFlow,
  handleCallback,
  createSessionToken,
  refreshAccessToken,
  getSessionToken,
} from './client.js';
import {
  clearSessionCookie,
  getSessionCookieName,
} from './session.js';
import type {
  ToqenConfig,
  ToqenInstance,
} from './types.js';

export function createToqen(config: ToqenConfig): ToqenInstance {
  return {
    start: (overrides?) =>
      startAuthFlow({ ...config, ...overrides }),

    callback: (context) =>
      handleCallback(config, context),

    createSession: (session) =>
      createSessionToken(config, session),

    getSession: (token) =>
      getSessionToken(config, token),

    refresh: (session) =>
      refreshAccessToken(config, session),

    cookies: {
      sessionName: (secure) =>
        getSessionCookieName(secure),

      clearSession: (secure) =>
        clearSessionCookie(secure),
    },
  };
}
