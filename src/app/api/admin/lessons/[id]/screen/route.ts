import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { gunzipSync } from 'node:zlib';
import { parseScreen, ValidationError } from '@/lib/admin/schema';

export const runtime = 'nodejs';

/**
 * Screens are megabytes of markup + base64 images, and a raw JSON body over
 * ~10MB arrives truncated (JSON.parse then dies on an unterminated string), so
 * the editor gzips it and flags that with X-Payload-Encoding. Plain JSON is
 * still accepted — handy for curl and for any older client.
 */
async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  if (req.headers.get('x-payload-encoding') !== 'gzip') {
    return (await req.json()) as Record<string, unknown>;
  }
  const raw = gunzipSync(Buffer.from(await req.arrayBuffer())).toString('utf8');
  return JSON.parse(raw) as Record<string, unknown>;
}

/**
 * Autosave target for the screen editor. A lesson holds at most one `screen`
 * block (the editor's authoring source), so this upserts rather than appending:
 * the editor fires it on every debounced edit and must not accumulate blocks.
 * The lesson's `published` flag is untouched — autosave never publishes.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id: lessonId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await readBody(req);
  } catch {
    return NextResponse.json(
      { error: 'invalid_json', message: 'Тело запроса не разобрано — не удалось распаковать или прочитать JSON' },
      { status: 400 },
    );
  }

  const lesson = await prisma.authoredLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let payload: string;
  try {
    payload = JSON.stringify(parseScreen((body.payload ?? {}) as Record<string, unknown>));
  } catch (e) {
    if (e instanceof ValidationError) {
      return NextResponse.json({ error: 'validation', message: e.message }, { status: 400 });
    }
    throw e;
  }

  // The rail's file name is the lesson's name — keep the row's title in step so
  // the drafts list doesn't show the name the file was first imported under.
  const title = String(JSON.parse(payload).fileName ?? '').replace(/\.svg$/i, '').trim();

  const existing = await prisma.contentBlock.findFirst({ where: { lessonId, kind: 'screen' } });
  if (existing) {
    await prisma.contentBlock.update({ where: { id: existing.id }, data: { payload } });
  } else {
    const last = await prisma.contentBlock.findFirst({ where: { lessonId }, orderBy: { order: 'desc' } });
    await prisma.contentBlock.create({
      data: { lessonId, kind: 'screen', order: (last?.order ?? -1) + 1, payload },
    });
  }
  // Touch the lesson so the drafts list orders by real edit time.
  await prisma.authoredLesson.update({
    where: { id: lessonId },
    data: { updatedAt: new Date(), ...(title ? { title } : {}) },
  });
  return NextResponse.json({ ok: true });
}
