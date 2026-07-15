import { SignJWT, jwtVerify } from 'jose';

/**
 * Learner session — a signed JWT in an httpOnly cookie, separate from the staff
 * session (src/lib/auth/session.ts). A learner earns one only after claiming a
 * LOGIN invite and setting email + password; anonymous learners keep the plain
 * `learner` cookie (src/lib/learner.ts). Same jose HS256 + AUTH_SECRET so
 * middleware can verify on the edge with no DB hit.
 *
 * The payload carries `kind: 'learner'` so a token can never be mistaken for a
 * staff session (which carries a `role`).
 */

export const LEARNER_SESSION_COOKIE = 'desstudy:learner-session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionLearner {
  id: string;
  email: string;
  name: string | null;
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set — cannot sign/verify sessions.');
  return new TextEncoder().encode(s);
}

/** Sign a learner session token. */
export async function signLearnerSession(learner: SessionLearner): Promise<string> {
  return new SignJWT({ kind: 'learner', email: learner.email, name: learner.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(learner.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

/** Verify a token → SessionLearner, or null if invalid/expired/not a learner token. */
export async function verifyLearnerSession(token: string): Promise<SessionLearner | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || payload.kind !== 'learner') return null;
    return {
      id: payload.sub,
      email: payload.email as string,
      name: (payload.name as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/** Cookie options shared by learner sign-in and sign-out. */
export const learnerSessionCookieOptions = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: MAX_AGE,
  path: '/',
};
