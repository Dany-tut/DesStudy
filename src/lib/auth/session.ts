import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@prisma/client';

/**
 * Staff session — a signed JWT stored in an httpOnly cookie. jose is
 * edge-compatible, so middleware.ts can verify the same token without a DB hit
 * (the role travels inside the token). Learners are unaffected — they keep the
 * separate `learner` cookie (src/lib/learner.ts).
 */

export const SESSION_COOKIE = 'desstudy:session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set — cannot sign/verify sessions.');
  return new TextEncoder().encode(s);
}

/** Sign a session token embedding the staff identity + role. */
export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

/** Verify a token → SessionUser, or null if invalid/expired. Edge-safe. */
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: payload.email as string,
      name: (payload.name as string | null) ?? null,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

/** Cookie options shared by the sign-in route and sign-out. */
export const sessionCookieOptions = {
  httpOnly: true as const,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: MAX_AGE,
  path: '/',
};
