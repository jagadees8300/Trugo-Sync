/**
 * MongoDB driver expects globalThis.crypto (Web Crypto).
 * Older Node (16 / early 18) does not expose it as a global.
 */
import { webcrypto } from 'node:crypto';

if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
    writable: true,
  });
}
