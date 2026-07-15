import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';

export const runtime = 'nodejs';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']);

function safeFilename(originalName: string) {
  const ext = path.extname(originalName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return `${randomUUID()}${ext}`;
}

/**
 * Admin-only asset upload (screen images for screen-critique). Unlike
 * /api/upload this isn't tied to a learner or a Submission — it just stores the
 * file and returns a public URL the exercise payload references.
 * Note: writes to local disk (public/uploads/admin) — swap for object storage
 * before deploying to a serverless/multi-instance runtime.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'unsupported_type' }, { status: 415 });
  }

  const dir = path.join(process.cwd(), 'public', 'uploads', 'admin');
  await mkdir(dir, { recursive: true });
  const filename = safeFilename(file.name);
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/admin/${filename}` });
}
