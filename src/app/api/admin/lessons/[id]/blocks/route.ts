import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { parseExercise, parseVideo, parseTheoryText, ValidationError } from '@/lib/admin/schema';

export const runtime = 'nodejs';

function validatePayload(kind: string, payload: Record<string, unknown>) {
  if (kind === 'theory') return { text: parseTheoryText(payload) };
  if (kind === 'video') return parseVideo(payload);
  if (kind === 'exercise') return parseExercise(payload);
  throw new ValidationError(`Неизвестный тип блока: ${kind}`);
}

/** Append a new block at the end of the lesson. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  requireAdmin();
  const { id: lessonId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const kind = typeof body.kind === 'string' ? body.kind : '';
  const payload = (body.payload ?? {}) as Record<string, unknown>;

  try {
    const validated = validatePayload(kind, payload);
    const last = await prisma.contentBlock.findFirst({
      where: { lessonId },
      orderBy: { order: 'desc' },
    });
    const block = await prisma.contentBlock.create({
      data: {
        lessonId,
        kind,
        order: (last?.order ?? -1) + 1,
        payload: JSON.stringify(validated),
      },
    });
    return NextResponse.json({ id: block.id }, { status: 201 });
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: 'validation', message: e.message }, { status: 400 });
    }
    throw e;
  }
}

/** Reorder — body: { order: string[] } — block ids in the desired final order. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  requireAdmin();
  const { id: lessonId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const order = Array.isArray(body.order) ? (body.order as string[]) : null;
  if (!order) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

  await prisma.$transaction(
    order.map((blockId, index) =>
      prisma.contentBlock.updateMany({
        where: { id: blockId, lessonId },
        data: { order: index },
      }),
    ),
  );
  return NextResponse.json({ ok: true });
}
