import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * A teacher issues a single-use learner link.
 *   kind: 'TEST'  → student opens it, enters ФИ, takes the grading test; a
 *                    Learner card is created on completion and attributed to
 *                    this teacher (and dropped into `groupId` if given).
 *   kind: 'LOGIN' → student sets email + password for an EXISTING card
 *                    (`learnerId` required and must belong to this teacher).
 * Consumed atomically later via the `usedAt` guard — see the register routes.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { kind?: string; groupId?: string; learnerId?: string; expiresInDays?: number } = {};
  try {
    body = await req.json();
  } catch {
    // body optional for a bare TEST link
  }

  const kind = body.kind === 'LOGIN' ? 'LOGIN' : body.kind === 'TEST' ? 'TEST' : null;
  if (!kind) return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });

  // If a group is pinned, it must belong to the caller (or caller is BOSS).
  const groupId = body.groupId?.trim() || null;
  if (groupId) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) return NextResponse.json({ error: 'group_not_found' }, { status: 404 });
    if (group.teacherId !== user.id && user.role !== 'BOSS') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  let learnerId: string | null = null;
  if (kind === 'LOGIN') {
    learnerId = body.learnerId?.trim() || null;
    if (!learnerId) return NextResponse.json({ error: 'missing_learner' }, { status: 400 });
    const learner = await prisma.learner.findUnique({ where: { id: learnerId } });
    if (!learner) return NextResponse.json({ error: 'learner_not_found' }, { status: 404 });
    if (learner.teacherId !== user.id && user.role !== 'BOSS') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (learner.passwordHash) {
      return NextResponse.json({ error: 'already_has_account' }, { status: 409 });
    }
  } else if (body.learnerId) {
    // TEST links never target an existing card — reject to avoid confusion.
    return NextResponse.json({ error: 'learner_not_allowed' }, { status: 400 });
  }

  const expiresAt =
    body.expiresInDays && body.expiresInDays > 0
      ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  const token = randomBytes(24).toString('base64url');
  await prisma.learnerInvite.create({
    data: { token, kind, teacherId: user.id, groupId, learnerId, expiresAt },
  });

  const path = kind === 'LOGIN' ? `/join/${token}` : `/test/${token}`;
  return NextResponse.json({ ok: true, token, kind, url: `${req.nextUrl.origin}${path}` });
}
