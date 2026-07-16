import { randomBytes } from 'crypto';

/**
 * A short, human-readable code for an entry-test session (e.g. `GT-7K3QD`).
 * Crockford-ish base32 (no 0/O/1/I to avoid misreads) so a teacher can dictate
 * it over a call. Not a secret — it only identifies a test-taker card.
 */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateTestKey(): string {
  const bytes = randomBytes(5);
  let code = '';
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return `GT-${code}`;
}
