/**
 * @jest-environment node
 */
import { sendTelegramAlert } from '@/lib/telegram';

const origFetch = global.fetch;

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
});

afterAll(() => {
  global.fetch = origFetch;
});

describe('sendTelegramAlert', () => {
  it('is a no-op when env vars missing', async () => {
    await sendTelegramAlert('test');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls Telegram API when both env vars set', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    process.env.TELEGRAM_CHAT_ID = '123';
    await sendTelegramAlert('hello');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bottok/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: expect.stringContaining('"chat_id":"123"'),
      })
    );
  });

  it('never throws — fire and forget', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'tok';
    process.env.TELEGRAM_CHAT_ID = '123';
    global.fetch = jest.fn().mockRejectedValue(new Error('network'));
    await expect(sendTelegramAlert('x')).resolves.toBeUndefined();
  });
});
