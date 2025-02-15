type InlineButton = {
  text: string;
  web_app?: { url: string };
  callback_data?: string;
};

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  buttons: InlineButton[][]
) {
  const BOT_TOKEN = process.env.TG_BOT_TOKEN!;
  const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  const response = await fetch(TELEGRAM_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: {
        inline_keyboard: buttons,
      },
    }),
  });
  return response.json();
}
