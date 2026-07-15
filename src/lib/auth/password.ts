import bcrypt from 'bcryptjs';

/**
 * Password hashing for staff (User) credentials. bcryptjs is pure-JS — no native
 * build step, works on Vercel's serverless runtime. Cost 10 is the standard
 * balance of security vs. login latency.
 */
const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
