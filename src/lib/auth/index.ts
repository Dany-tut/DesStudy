import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySession, type SessionUser } from './session';

/**
 * Server-side session helpers for Server Components and Route Handlers.
 * Read the session cookie, verify the JWT, and gate by role. The token carries
 * the role, so these don't hit the DB — cheap enough to call per request.
 * Middleware (middleware.ts) does the coarse redirect; these are the in-page
 * guard + typed `user` for rendering.
 */

/** Current staff user, or null if not signed in. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Require any signed-in staff; redirect to /signin otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/signin');
  return user;
}

/** Require the BOSS; teachers and anon are bounced. */
export async function requireBoss(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'BOSS') redirect('/teacher');
  return user;
}

/** Require staff (BOSS or TEACHER) — the teacher cabinet gate. */
export async function requireTeacher(): Promise<SessionUser> {
  return requireUser();
}

export type { SessionUser } from './session';
