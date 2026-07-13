import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { blocksToLesson } from '@/lib/admin/blocksToLesson';

export const runtime = 'nodejs';

/** Body: { published: boolean }. Publishing re-validates the full lesson shape first. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  requireAdmin();
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const published = body.published === true;

  const lesson = await prisma.authoredLesson.findUnique({
    where: { id },
    include: { blocks: true },
  });
  if (!lesson) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (published) {
    try {
      blocksToLesson(lesson, lesson.blocks);
    } catch (e) {
      return NextResponse.json(
        { error: 'incomplete', message: e instanceof Error ? e.message : 'Урок не готов к публикации' },
        { status: 400 },
      );
    }
  }

  await prisma.authoredLesson.update({ where: { id }, data: { published } });
  return NextResponse.json({ ok: true });
}
