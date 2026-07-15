import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { signSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';

export const runtime = 'nodejs';

/** Staff sign-in with email + password → sets the session cookie. */
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

  const user = await prisma.user.findUnique({ where: { email } });
  // Same generic error whether the email is unknown or the password is wrong —
  // don't leak which accounts exist.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const token = await signSession({ id: user.id, email: user.email, name: user.name, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);

  return NextResponse.json({ ok: true, role: user.role });
}
