import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

interface EnrollBody {
  learnerId?: string;
  courseId?: string;
  /** when true, remove the enrollment instead of creating it */
  remove?: boolean;
}

/** Teacher attaches (or detaches) a purchased course to a learner. */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: EnrollBody;
  try {
    body = (await req.json()) as EnrollBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { learnerId, courseId, remove } = body;
  if (!learnerId || !courseId) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  if (remove) {
    await prisma.enrollment.deleteMany({ where: { learnerId, courseId } });
    return NextResponse.json({ ok: true, enrolled: false });
  }

  await prisma.enrollment.upsert({
    where: { learnerId_courseId: { learnerId, courseId } },
    update: {},
    create: { learnerId, courseId },
  });
  return NextResponse.json({ ok: true, enrolled: true });
}
