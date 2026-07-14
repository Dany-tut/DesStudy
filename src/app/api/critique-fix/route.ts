import { NextRequest, NextResponse } from 'next/server';
import { coachFix, type FixInput } from '@/lib/ai/mentor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: FixInput;
  try {
    body = (await req.json()) as FixInput;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body?.fix?.trim() || !body?.region?.trim() || !body?.intent?.trim()) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const reply = await coachFix(body);
  return NextResponse.json(reply);
}
