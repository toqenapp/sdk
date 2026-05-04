import {
  startAuthFlow,
  handleCallback,
  createSessionToken,
  refreshAccessToken,
  getSessionToken,
  endSession,
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

    endSession: () => endSession(config),

    cookies: {
      sessionName: (secure) =>
        getSessionCookieName(secure),
    },
  };
}
