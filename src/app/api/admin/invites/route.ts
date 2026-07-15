import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

/** BOSS creates a single-use teacher invite link. Only the boss may invite. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== 'BOSS') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { email?: string; expiresInDays?: number } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional — a bare invite with no email/expiry is valid.
  }

  const email = body.email?.trim().toLowerCase() || null;
  const expiresAt =
    body.expiresInDays && body.expiresInDays > 0
      ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  const token = randomBytes(24).toString('base64url');
  const invite = await prisma.invite.create({
    data: { token, role: 'TEACHER', email, expiresAt, createdById: user.id },
  });

  return NextResponse.json({ ok: true, token: invite.token, id: invite.id });
}
