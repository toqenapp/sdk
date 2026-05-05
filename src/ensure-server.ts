export function ensureServer(): void {
  if (typeof globalThis.window !== 'undefined') {
    throw new Error(
      'This Toqen SDK module is server-only and must not be imported in client-side code.',
    );
  }
}
