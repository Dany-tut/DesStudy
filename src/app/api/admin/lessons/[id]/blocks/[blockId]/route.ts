import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { parseExercise, parseVideo, parseTheoryText, parseScreen, ValidationError } from '@/lib/admin/schema';

export const runtime = 'nodejs';

function validatePayload(kind: string, payload: Record<string, unknown>) {
  if (kind === 'theory') return { text: parseTheoryText(payload) };
  if (kind === 'video') return parseVideo(payload);
  if (kind === 'exercise') return parseExercise(payload);
  if (kind === 'screen') return parseScreen(payload);
  throw new ValidationError(`Неизвестный тип блока: ${kind}`);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id: lessonId, blockId } = await params;
  const existing = await prisma.contentBlock.findFirst({ where: { id: blockId, lessonId } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const payload = (body.payload ?? {}) as Record<string, unknown>;

  try {
    const validated = validatePayload(existing.kind, payload);
    await prisma.contentBlock.update({
      where: { id: blockId },
      data: { payload: JSON.stringify(validated) },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: 'validation', message: e.message }, { status: 400 });
    }
    throw e;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id: lessonId, blockId } = await params;
  await prisma.contentBlock.deleteMany({ where: { id: blockId, lessonId } });
  return NextResponse.json({ ok: true });
}
