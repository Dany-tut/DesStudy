import { NextRequest, NextResponse } from 'next/server';
import { coachObservation, type ObserveInput } from '@/lib/ai/mentor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: ObserveInput;
  try {
    body = (await req.json()) as ObserveInput;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body?.observation?.trim() || !Array.isArray(body.concepts)) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const reply = await coachObservation(body);
  return NextResponse.json(reply);
}
