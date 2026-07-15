import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signSession, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';

export const runtime = 'nodejs';

/**
 * Consume a single-use invite → create a staff User with the invite's role,
 * then sign them in. The invite is claimed atomically (updateMany guarded on
 * usedById: null) so two concurrent registrations can't both win one link.
 */
export async function POST(req: NextRequest) {
  let body: { token?: string; email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const token = body.token?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';
  const name = body.name?.trim() || null;

  if (!token || !email || password.length < 8) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const invite = await prisma.invite.findUnique({ where: { token } });
  if (!invite || invite.usedById) {
    return NextResponse.json({ error: 'invite_invalid' }, { status: 400 });
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'invite_expired' }, { status: 400 });
  }
  // If the invite pins an email, the registrant must use it.
  if (invite.email && invite.email.toLowerCase() !== email) {
    return NextResponse.json({ error: 'email_mismatch' }, { status: 400 });
  }

  if (await prisma.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: 'email_taken' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  // Create the user + claim the invite in one transaction; the updateMany
  // guard on usedById: null is the concurrency lock.
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash, name, role: invite.role },
      });
      const claim = await tx.invite.updateMany({
        where: { id: invite.id, usedById: null },
        data: { usedById: created.id },
      });
      if (claim.count === 0) throw new Error('invite_race');
      return created;
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'invite_race') {
      return NextResponse.json({ error: 'invite_invalid' }, { status: 400 });
    }
    throw e;
  }

  const session = await signSession({ id: user.id, email: user.email, name: user.name, role: user.role });
  (await cookies()).set(SESSION_COOKIE, session, sessionCookieOptions);

  return NextResponse.json({ ok: true, role: user.role });
}
