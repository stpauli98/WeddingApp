/**
 * Optional critical-event alerting via Telegram bot.
 * No-op if env vars not configured. Never throws (fire-and-forget).
 */
export async function sendTelegramAlert(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_notification: false,
      }),
    });
  } catch (err) {
    console.error('Telegram alert failed:', err);
  }
}
