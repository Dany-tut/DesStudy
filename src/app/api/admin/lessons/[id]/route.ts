import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { parseLessonMeta, isValidSlug, ValidationError } from '@/lib/admin/schema';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const lesson = await prisma.authoredLesson.findUnique({
    where: { id },
    include: { blocks: { orderBy: { order: 'asc' } } },
  });
  if (!lesson) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    ...lesson,
    objectives: JSON.parse(lesson.objectives),
    prerequisites: JSON.parse(lesson.prerequisites),
    blocks: lesson.blocks.map((b) => ({ ...b, payload: JSON.parse(b.payload) })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const existing = await prisma.authoredLesson.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const nextSlug = typeof body.slug === 'string' ? body.slug : existing.slug;
  if (!isValidSlug(nextSlug)) {
    return NextResponse.json(
      { error: 'invalid_slug', message: 'Slug: строчные латинские буквы, цифры, дефисы' },
      { status: 400 },
    );
  }
  if (nextSlug !== existing.slug) {
    const clash = await prisma.authoredLesson.findUnique({ where: { slug: nextSlug } });
    if (clash) {
      return NextResponse.json(
        { error: 'slug_taken', message: 'Такой slug уже используется' },
        { status: 409 },
      );
    }
  }

  try {
    const meta = parseLessonMeta(body);
    await prisma.authoredLesson.update({
      where: { id },
      data: {
        slug: nextSlug,
        title: meta.title,
        pathTitle: meta.pathTitle,
        skill: meta.skill,
        difficulty: meta.difficulty,
        estimatedMinutes: meta.estimatedMinutes,
        objectives: JSON.stringify(meta.objectives),
        prerequisites: JSON.stringify(meta.prerequisites),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: 'validation', message: e.message }, { status: 400 });
    }
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  await prisma.authoredLesson.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
