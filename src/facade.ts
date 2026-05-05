import {
  startLogin,
  handleCallback,
  createSessionToken,
  refreshAccessToken,
  getSessionToken,
  endSession,
} from './client.js';
import { ensureServer } from './ensure-server.js';
import {
  getSessionCookieName,
} from './session.js';
import type {
  ToqenConfig,
  ToqenInstance,
} from './types.js';

ensureServer();

export function createToqen(config: ToqenConfig): ToqenInstance {
  return {
    start: (options?) =>
      startLogin(config, options),

    callback: (context) =>
      handleCallback(config, context),

    createSession: (session, options?) =>
      createSessionToken(config, session, options),

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
