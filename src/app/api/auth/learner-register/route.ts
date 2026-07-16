import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import {
  signLearnerSession,
  LEARNER_SESSION_COOKIE,
  learnerSessionCookieOptions,
} from '@/lib/auth/learner-session';

export const runtime = 'nodejs';

/**
 * Consume a LOGIN invite → set email + password on the invite's existing
 * learner card, then sign the student in (learner session). The invite is
 * claimed atomically (updateMany guarded on usedAt: null) so one link can't be
 * spent twice — same lock the staff register route uses.
 */
export async function POST(req: NextRequest) {
  let body: { token?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const token = body.token?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? '';

  if (!token || !email || password.length < 8) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const invite = await prisma.learnerInvite.findUnique({ where: { token } });
  if (!invite || invite.kind !== 'LOGIN' || invite.usedAt || !invite.learnerId) {
    return NextResponse.json({ error: 'invite_invalid' }, { status: 400 });
  }
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'invite_expired' }, { status: 400 });
  }

  // Email must be free across both learner cards and staff users.
  const [learnerClash, staffClash] = await Promise.all([
    prisma.learner.findUnique({ where: { email } }),
    prisma.user.findUnique({ where: { email } }),
  ]);
  if (learnerClash || staffClash) {
    return NextResponse.json({ error: 'email_taken' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const learnerId = invite.learnerId;

  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.learnerInvite.updateMany({
        where: { id: invite.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (claim.count === 0) throw new Error('invite_race');
      await tx.learner.update({
        where: { id: learnerId },
        // passwordPlain is stored so the teacher can recover credentials for a
        // student in the admin — see the field comment in schema.prisma.
        data: { email, passwordHash, passwordPlain: password },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'invite_race') {
      return NextResponse.json({ error: 'invite_invalid' }, { status: 400 });
    }
    throw e;
  }

  const learner = await prisma.learner.findUnique({ where: { id: learnerId } });
  const session = await signLearnerSession({ id: learnerId, email, name: learner?.name ?? null });
  (await cookies()).set(LEARNER_SESSION_COOKIE, session, learnerSessionCookieOptions);

  return NextResponse.json({ ok: true });
}
