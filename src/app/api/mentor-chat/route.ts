import { NextRequest, NextResponse } from 'next/server';
import { coachChat } from '@/lib/ai/mentor';

export const runtime = 'nodejs';

/**
 * Landing mentor chat. POST { message, history? } → { reply, offline? }.
 * Backed by a light model (Haiku 4.5); degrades to a canned guiding question
 * when ANTHROPIC_API_KEY is unset, so the demo works offline.
 */
export async function POST(req: NextRequest) {
  let body: { message?: unknown; history?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'missing_message' }, { status: 400 });
  }

  const history = Array.isArray(body.history)
    ? (body.history as { role: 'user' | 'assistant'; content: string }[]).filter(
        (m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string',
      )
    : [];

  // Landing teaser: cap input length (matches the client) so it can't be used
  // as a free, unbounded AI chat.
  const reply = await coachChat(message.slice(0, 200), history.slice(-8));
  return NextResponse.json(reply);
}
