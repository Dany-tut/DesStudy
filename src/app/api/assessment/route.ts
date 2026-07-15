import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { SKILLS, type SkillLevel } from '@/lib/assessment/taxonomy';
import { computeGrade, serializeCategoryGrades, type Scores } from '@/lib/assessment/grade';

export const runtime = 'nodejs';

interface SubmitBody {
  name?: string;
  scores?: Record<string, number>;
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

  const learner = await getOrCreateLearner();

  // Persist ФИ if provided and not yet set (or changed).
  const name = body.name?.trim();
  if (name && name !== learner.name) {
    await prisma.learner.update({ where: { id: learner.id }, data: { name } });
  }

  const result = computeGrade(scores);
  const assessment = await prisma.assessment.create({
    data: {
      learnerId: learner.id,
      grade: result.grade,
      scores: JSON.stringify(scores),
      categoryGrades: serializeCategoryGrades(result),
    },
  });

  return NextResponse.json({
    id: assessment.id,
    grade: result.grade,
    avg: result.avg,
    perCategory: result.perCategory,
  });
}
