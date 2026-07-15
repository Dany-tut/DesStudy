import { NextRequest, NextResponse } from 'next/server';
import { getCurrentLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { SKILLS, type SkillLevel } from '@/lib/assessment/taxonomy';
import { computeGrade, serializeCategoryGrades, type Scores } from '@/lib/assessment/grade';

export const runtime = 'nodejs';

interface SubmitBody {
  name?: string;
  scores?: Record<string, number>;
  // A teacher's TEST link. When present and valid, the resulting learner card
  // is attributed to that teacher (and joined to the link's group).
  inviteToken?: string;
}

function isLevel(n: unknown): n is SkillLevel {
  return n === 1 || n === 2 || n === 3 || n === 4;
}

export async function POST(req: NextRequest) {
  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // Validate: every skill must have a valid 1..4 level.
  const scores: Scores = {};
  for (const skill of SKILLS) {
    const raw = body.scores?.[skill.id];
    if (!isLevel(raw)) {
      return NextResponse.json({ error: 'missing_or_invalid_score', skill: skill.id }, { status: 400 });
    }
    scores[skill.id] = raw;
  }

  const learner = await getCurrentLearner();

  // A valid, unused, unexpired TEST link attributes this card to its teacher
  // (and its group). Guests without a link just get an unattributed card.
  const token = body.inviteToken?.trim();
  let invite = null as Awaited<ReturnType<typeof prisma.learnerInvite.findUnique>>;
  if (token) {
    invite = await prisma.learnerInvite.findUnique({ where: { token } });
    const usable =
      invite &&
      invite.kind === 'TEST' &&
      !invite.usedAt &&
      (!invite.expiresAt || invite.expiresAt >= new Date());
    if (!usable) invite = null;
  }

  // Persist ФИ if provided and not yet set (or changed); claim the TEST link.
  const name = body.name?.trim();
  const result = computeGrade(scores);

  const assessment = await prisma.$transaction(async (tx) => {
    if (invite) {
      // Attribute the card to the teacher; atomically claim the link.
      await tx.learner.update({
        where: { id: learner.id },
        data: { teacherId: invite.teacherId, ...(name ? { name } : {}) },
      });
      const claim = await tx.learnerInvite.updateMany({
        where: { id: invite.id, usedAt: null },
        data: { usedAt: new Date(), learnerId: learner.id },
      });
      // Lost the race (link used concurrently) → still record the assessment,
      // just without re-attributing. Best-effort, no hard failure.
      if (claim.count > 0 && invite.groupId) {
        await tx.groupMembership.upsert({
          where: { groupId_learnerId: { groupId: invite.groupId, learnerId: learner.id } },
          update: {},
          create: { groupId: invite.groupId, learnerId: learner.id },
        });
      }
    } else if (name && name !== learner.name) {
      await tx.learner.update({ where: { id: learner.id }, data: { name } });
    }

    return tx.assessment.create({
      data: {
        learnerId: learner.id,
        grade: result.grade,
        scores: JSON.stringify(scores),
        categoryGrades: serializeCategoryGrades(result),
      },
    });
  });

  return NextResponse.json({
    id: assessment.id,
    grade: result.grade,
    avg: result.avg,
    perCategory: result.perCategory,
  });
}
