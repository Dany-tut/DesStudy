import { NextRequest, NextResponse } from 'next/server';
import { coach, type MentorInput } from '@/lib/ai/mentor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: MentorInput;
  try {
    body = (await req.json()) as MentorInput;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body?.prompt || typeof body.correct !== 'boolean') {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const reply = await coach(body);
  return NextResponse.json(reply);
}
