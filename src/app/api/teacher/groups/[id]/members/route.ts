import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

/** Add or remove a learner in a group. Owner (or boss) only. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id: groupId } = await params;
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (group.teacherId !== user.id && user.role !== 'BOSS') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { learnerId?: string; remove?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const learnerId = body.learnerId?.trim();
  if (!learnerId) return NextResponse.json({ error: 'missing_learner' }, { status: 400 });

  if (body.remove) {
    await prisma.groupMembership.deleteMany({ where: { groupId, learnerId } });
    return NextResponse.json({ ok: true, member: false });
  }

  // Guard against a learnerId that doesn't exist (FK would 500 otherwise).
  const learner = await prisma.learner.findUnique({ where: { id: learnerId } });
  if (!learner) return NextResponse.json({ error: 'learner_not_found' }, { status: 404 });

  await prisma.groupMembership.upsert({
    where: { groupId_learnerId: { groupId, learnerId } },
    update: {},
    create: { groupId, learnerId },
  });
  return NextResponse.json({ ok: true, member: true });
}
