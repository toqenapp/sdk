import { ensureServer } from './ensure-server.js';

ensureServer();

function getCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is not available in this runtime.');
  }

  return globalThis.crypto;
}

export function generateState(): string {
  const crypto = getCrypto();

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  return toBase64Url(bytes);
}

export async function generatePkce(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const crypto = getCrypto();

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  const verifier = toBase64Url(bytes);

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );

  return {
    verifier,
    challenge: toBase64Url(new Uint8Array(digest)),
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return globalThis
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
