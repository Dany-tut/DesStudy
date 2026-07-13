import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { parseLessonMeta, isValidSlug, ValidationError } from '@/lib/admin/schema';

export const runtime = 'nodejs';

export async function GET() {
  requireAdmin();
  const rows = await prisma.authoredLesson.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { blocks: true } } },
  });
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      published: r.published,
      updatedAt: r.updatedAt,
      blockCount: r._count.blocks,
    })),
  );
}

export async function POST(req: NextRequest) {
  requireAdmin();
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const slug = typeof body.slug === 'string' ? body.slug : '';
  if (!isValidSlug(slug)) {
    return NextResponse.json(
      { error: 'invalid_slug', message: 'Slug: строчные латинские буквы, цифры, дефисы' },
      { status: 400 },
    );
  }

  try {
    const meta = parseLessonMeta(body);
    const existing = await prisma.authoredLesson.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: 'slug_taken', message: 'Такой slug уже используется' },
        { status: 409 },
      );
    }
    const lesson = await prisma.authoredLesson.create({
      data: {
        slug,
        title: meta.title,
        pathTitle: meta.pathTitle,
        skill: meta.skill,
        difficulty: meta.difficulty,
        estimatedMinutes: meta.estimatedMinutes,
        objectives: JSON.stringify(meta.objectives),
        prerequisites: JSON.stringify(meta.prerequisites),
      },
    });
    return NextResponse.json({ id: lesson.id }, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: 'validation', message: e.message }, { status: 400 });
    }
    throw e;
  }
}
