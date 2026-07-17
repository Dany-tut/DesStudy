import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { nameFrames } from '@/lib/ai/nameFrames';
import type { FrameDigest } from '@/lib/editor/frameDigest';

export const runtime = 'nodejs';

/** Admin-only: name one frame and every layer inside it, from a render of the
 *  frame plus each layer's box. One frame per request — each carries its own
 *  image, and the editor fires them per frame so the tree fills in as answers
 *  land rather than all at once at the end. */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: FrameDigest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (typeof body?.id !== 'string' || !Array.isArray(body?.layers)) {
    return NextResponse.json({ error: 'missing_frame' }, { status: 400 });
  }

  const reply = await nameFrames(body);
  return NextResponse.json(reply);
}
