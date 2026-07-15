import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { signSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import {
  signLearnerSession,
  LEARNER_SESSION_COOKIE,
  learnerSessionCookieOptions,
} from '@/lib/auth/learner-session';

export const runtime = 'nodejs';

/**
 * Unified sign-in with email + password. Tries staff (User) first, then a
 * learner card with credentials. Single endpoint so students and staff use the
 * same form; the response `kind` tells the client where to redirect. Errors are
 * generic — never reveal which table (or none) held the address.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';
  if (!email || !password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const jar = await cookies();

  // 1) Staff account.
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && (await verifyPassword(password, user.passwordHash))) {
    const token = await signSession({ id: user.id, email: user.email, name: user.name, role: user.role });
    jar.set(SESSION_COOKIE, token, sessionCookieOptions);
    return NextResponse.json({ ok: true, kind: 'staff', role: user.role });
  }

  // 2) Learner card with credentials (set via a LOGIN invite).
  const learner = await prisma.learner.findUnique({ where: { email } });
  if (learner?.passwordHash && (await verifyPassword(password, learner.passwordHash))) {
    const token = await signLearnerSession({ id: learner.id, email: email, name: learner.name });
    jar.set(LEARNER_SESSION_COOKIE, token, learnerSessionCookieOptions);
    return NextResponse.json({ ok: true, kind: 'learner' });
  }

  // Same generic error whether the email is unknown or the password is wrong.
  return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
}
