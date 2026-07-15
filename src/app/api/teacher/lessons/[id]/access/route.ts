import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * Set a lesson's visibility. PUBLIC clears any grants; RESTRICTED replaces the
 * group/learner grant sets wholesale. Only the lesson's author (or the boss)
 * may change access. Grants are only honoured while access === RESTRICTED, but
 * we persist them either way so toggling back doesn't lose the selection.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id: lessonId } = await params;
  const lesson = await prisma.authoredLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (lesson.authorId !== user.id && user.role !== 'BOSS') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: { access?: string; groupIds?: string[]; learnerIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const access = body.access === 'RESTRICTED' ? 'RESTRICTED' : 'PUBLIC';
  const groupIds = Array.isArray(body.groupIds) ? [...new Set(body.groupIds)] : [];
  const learnerIds = Array.isArray(body.learnerIds) ? [...new Set(body.learnerIds)] : [];

  // Guard the grant lists against ids the caller doesn't own / that don't exist,
  // so a crafted request can't seed rows referencing arbitrary groups.
  const ownedGroups =
    groupIds.length > 0
      ? await prisma.group.findMany({
          where: {
            id: { in: groupIds },
            ...(user.role === 'BOSS' ? {} : { teacherId: user.id }),
          },
          select: { id: true },
        })
      : [];
  const validGroupIds = ownedGroups.map((g) => g.id);

  const existingLearners =
    learnerIds.length > 0
      ? await prisma.learner.findMany({ where: { id: { in: learnerIds } }, select: { id: true } })
      : [];
  const validLearnerIds = existingLearners.map((l) => l.id);

  await prisma.$transaction([
    prisma.authoredLesson.update({ where: { id: lessonId }, data: { access } }),
    prisma.lessonGroupAccess.deleteMany({ where: { lessonId } }),
    prisma.lessonLearnerAccess.deleteMany({ where: { lessonId } }),
    prisma.lessonGroupAccess.createMany({
      data: validGroupIds.map((groupId) => ({ lessonId, groupId })),
    }),
    prisma.lessonLearnerAccess.createMany({
      data: validLearnerIds.map((learnerId) => ({ lessonId, learnerId })),
    }),
  ]);

  return NextResponse.json({
    ok: true,
    access,
    groupIds: validGroupIds,
    learnerIds: validLearnerIds,
  });
}
