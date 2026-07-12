import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateLearner } from '@/lib/learner';
import { recordAttempt, type RecordAttemptInput } from '@/lib/progress';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: RecordAttemptInput;
  try {
    body = (await req.json()) as RecordAttemptInput;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body?.exerciseId || !body?.lessonSlug || typeof body.correct !== 'boolean') {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const learner = await getOrCreateLearner();
  const result = await recordAttempt(learner.id, body);
  return NextResponse.json(result);
}
