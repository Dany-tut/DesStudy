import { NextResponse } from 'next/server';
import { getCurrentLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';
import { generateTestKey } from '@/lib/assessment/testKey';

export const runtime = 'nodejs';

/**
 * "Зашёл на тест" — called the moment a visitor clicks "Пройти тест на грейд"
 * on the landing, before they answer anything. Ensures a Learner card exists
 * (cookie identity) and stamps it with a self-generated key + startedAt, so the
 * (possibly unfinished) test-taker surfaces to the teacher/admin board. Idempotent:
 * a learner keeps their first key and their first start time.
 */
export async function POST() {
  const learner = await getCurrentLearner();

  if (learner.testKey) {
    return NextResponse.json({ key: learner.testKey });
  }

  // Retry on the (astronomically unlikely) unique collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const key = generateTestKey();
    try {
      const updated = await prisma.learner.update({
        where: { id: learner.id },
        data: { testKey: key, startedAt: learner.startedAt ?? new Date() },
      });
      return NextResponse.json({ key: updated.testKey });
    } catch {
      // Unique violation on testKey → try a fresh code.
    }
  }

  return NextResponse.json({ error: 'key_generation_failed' }, { status: 500 });
}
