import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { analyzeScreen, type CritiqueImageMediaType } from '@/lib/ai/critiqueAnalyze';

export const runtime = 'nodejs';

const ALLOWED: CritiqueImageMediaType[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
];

/** Admin-only: analyze an uploaded screen and propose critique zones. */
export async function POST(req: NextRequest) {
  requireAdmin();

  let body: {
    imageBase64?: string;
    mediaType?: string;
    screenTitle?: string;
    goodBase64?: string;
    goodMediaType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.imageBase64 || !ALLOWED.includes(body.mediaType as CritiqueImageMediaType)) {
    return NextResponse.json({ error: 'missing_or_unsupported_image' }, { status: 400 });
  }

  const reply = await analyzeScreen({
    imageBase64: body.imageBase64,
    mediaType: body.mediaType as CritiqueImageMediaType,
    screenTitle: body.screenTitle,
    goodBase64: body.goodBase64,
    goodMediaType: ALLOWED.includes(body.goodMediaType as CritiqueImageMediaType)
      ? (body.goodMediaType as CritiqueImageMediaType)
      : undefined,
  });

  return NextResponse.json(reply);
}
