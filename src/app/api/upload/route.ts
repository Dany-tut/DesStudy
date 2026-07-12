import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateLearner } from '@/lib/learner';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

// Hard server-side ceiling regardless of what the exercise/client claims.
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
]);

/** Strip everything but a safe extension + short random name — never trust the original filename. */
function safeFilename(originalName: string) {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return `${randomUUID()}${ext}`;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file');
  const lessonSlug = form.get('lessonSlug');
  const exerciseId = form.get('exerciseId');

  if (!(file instanceof File) || typeof lessonSlug !== 'string' || typeof exerciseId !== 'string') {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 415 });
  }

  const learner = await getOrCreateLearner();
  const dir = path.join(process.cwd(), 'public', 'uploads', learner.id);
  await mkdir(dir, { recursive: true });

  const filename = safeFilename(file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  const publicUrl = `/uploads/${learner.id}/${filename}`;

  await prisma.submission.create({
    data: {
      learnerId: learner.id,
      lessonSlug,
      exerciseId,
      kind: 'file-upload',
      value: publicUrl,
    },
  });

  return NextResponse.json({ url: publicUrl });
}
