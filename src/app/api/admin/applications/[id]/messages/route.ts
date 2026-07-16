import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { sendTelegramTo, botChatLink, escapeHtml } from '@/lib/notify/telegram';

export const runtime = 'nodejs';

/**
 * The curator↔applicant chat behind a заявка, for the admin «Заявки» tab.
 * BOSS-only, same gate as the rest of /admin.
 *
 *   GET  — the conversation plus whether the applicant has connected the bot
 *          (`connected`) and, if not, the deep link to share so they can.
 *   POST — send a message to the applicant over the bot and record it. 409 when
 *          the applicant hasn't pressed Start yet (no chat id to send to).
 *
 * Messages are scoped to the application's learner, so they persist across
 * re-submitted заявки.
 */

async function loadLearner(applicationId: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { learner: { select: { id: true, tgChatId: true, tgLinkToken: true } } },
  });
  return app?.learner ?? null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'BOSS') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  const learner = await loadLearner(id);
  if (!learner) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const messages = await prisma.chatMessage.findMany({
    where: { learnerId: learner.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, direction: true, text: true, createdAt: true },
  });

  return NextResponse.json({
    connected: !!learner.tgChatId,
    chatLink: learner.tgLinkToken ? botChatLink(learner.tgLinkToken) : null,
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      text: m.text,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'BOSS') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { id } = await params;

  let body: { text?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const learner = await loadLearner(id);
  if (!learner) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!learner.tgChatId) {
    return NextResponse.json({ error: 'not_connected' }, { status: 409 });
  }

  const delivered = await sendTelegramTo(learner.tgChatId, escapeHtml(text));
  if (!delivered) {
    return NextResponse.json({ error: 'send_failed' }, { status: 502 });
  }

  const saved = await prisma.chatMessage.create({
    data: { learnerId: learner.id, direction: 'out', text },
    select: { id: true, direction: true, text: true, createdAt: true },
  });

  return NextResponse.json({
    ok: true,
    message: {
      id: saved.id,
      direction: saved.direction,
      text: saved.text,
      createdAt: saved.createdAt.toISOString(),
    },
  });
}
