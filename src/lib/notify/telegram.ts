/**
 * Telegram bot notifications for the curator. When a guest leaves a заявка on
 * the pricing screen we both persist it (admin sees it under «Заявки») AND ping
 * a Telegram chat so a human reacts fast — «админ пишет в админке, а смс в чате
 * тг».
 *
 * Configured entirely through env so no secrets live in the repo:
 *   TELEGRAM_BOT_TOKEN — the bot's API token (from @BotFather)
 *   TELEGRAM_CHAT_ID   — the curator chat/channel id the bot posts into
 * If either is missing the sender is a silent no-op, so заявки keep working in
 * dev/CI where the bot isn't wired up.
 */

const API = 'https://api.telegram.org';

/** True when the bot is configured — заявка code can branch on this if needed. */
export function isTelegramConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

/**
 * Post a message to the curator chat. Best-effort: never throws, so a Telegram
 * outage can't fail the заявка. Returns whether the message was delivered.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  try {
    const res = await fetch(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Escape user-supplied text for Telegram HTML parse mode. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
