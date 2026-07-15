import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * A teacher creates a blank learner card by name (no test yet). Used by the
 * "add student" action so a teacher can pre-create a card and hand out a LOGIN
 * link, or add someone who tested elsewhere. The card is attributed to the
 * teacher (`teacherId`) so it scopes into their testing view.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: 'missing_name' }, { status: 400 });

  const learner = await prisma.learner.create({
    data: { name, teacherId: user.id },
  });

  return NextResponse.json({ ok: true, id: learner.id, name: learner.name });
}
