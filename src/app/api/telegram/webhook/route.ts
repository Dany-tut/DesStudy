import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendTelegramMessage, sendTelegramTo, escapeHtml } from '@/lib/notify/telegram';

export const runtime = 'nodejs';

/**
 * Telegram webhook for the curator↔applicant chat. Telegram POSTs an Update here
 * for every message the bot receives. We handle two cases from a *private* chat:
 *
 *   1. `/start <token>` — the applicant opened the deep link we gave them after
 *      their заявка. Resolve the token to a learner, store their chat id, and
 *      confirm. From now on the curator can reply from the admin «Заявки» tab.
 *   2. any other text — a reply from an already-linked applicant. Store it as an
 *      inbound ChatMessage and ping the curator chat so someone reacts.
 *
 * Everything else (group/curator-chat traffic, non-text, unknown chats) is
 * ignored. Auth is the shared secret Telegram echoes in a header — set the same
 * value when registering the webhook (setWebhook?secret_token=...).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers.get('x-telegram-bot-api-secret-token');
    if (got !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true }); // ack malformed updates, never retry
  }

  const msg = update.message;
  // Only private-chat text messages drive the applicant chat.
  if (!msg || msg.chat?.type !== 'private' || typeof msg.text !== 'string') {
    return NextResponse.json({ ok: true });
  }

  const chatId = String(msg.chat.id);
  const text = msg.text.trim();

  // 1. /start <token> — link this Telegram chat to the learner.
  const startMatch = text.match(/^\/start(?:\s+(.+))?$/);
  if (startMatch) {
    const token = startMatch[1]?.trim();
    if (token) {
      const learner = await prisma.learner.findUnique({ where: { tgLinkToken: token } });
      if (learner) {
        // Bind this chat to the learner unless another chat already claimed it.
        const claimed = await prisma.learner.findUnique({ where: { tgChatId: chatId } });
        if (!claimed || claimed.id === learner.id) {
          await prisma.learner.update({
            where: { id: learner.id },
            data: { tgChatId: chatId },
          });
        }
        await sendTelegramTo(
          chatId,
          'Готово! Здесь с вами свяжется куратор DesStudy. Напишите сообщение — и мы ответим. ✨',
        );
        return NextResponse.json({ ok: true });
      }
    }
    await sendTelegramTo(chatId, 'Привет! Оставьте заявку на сайте DesStudy, чтобы начать диалог с куратором.');
    return NextResponse.json({ ok: true });
  }

  // 2. Reply from a linked applicant.
  const learner = await prisma.learner.findUnique({ where: { tgChatId: chatId } });
  if (!learner) {
    return NextResponse.json({ ok: true }); // unknown sender — nothing to attach it to
  }

  await prisma.chatMessage.create({
    data: { learnerId: learner.id, direction: 'in', text },
  });

  // Nudge the curator chat so a human notices even if the admin tab is closed.
  await sendTelegramMessage(
    [`💬 <b>Сообщение от ${escapeHtml(learner.name || 'заявителя')}</b>`, escapeHtml(text)].join('\n'),
  );

  return NextResponse.json({ ok: true });
}

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id: number | string; type?: string };
  };
};
