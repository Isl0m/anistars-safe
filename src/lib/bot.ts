type InlineButton = {
  text: string;
  web_app?: { url: string };
  callback_data?: string;
};

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  buttons?: InlineButton[][]
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
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: buttons,
      },
    }),
  });
  return response.json();
}

type GetMeResponse = {
  ok: boolean;
  result: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
  };
};

export async function getMe(): Promise<GetMeResponse> {
  const BOT_TOKEN = process.env.TG_BOT_TOKEN!;
  const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`;

  const response = await fetch(TELEGRAM_API);
  return response.json();
}

export function getProfileLink(
  botUsername: string,
  userId: string,
  name: string
) {
  const profileUrl = `https://t.me/${botUsername}?start=profile-${userId}`;
  return `<a href="${profileUrl}">${name}</a>`;
}
