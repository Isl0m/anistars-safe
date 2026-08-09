import { NextResponse } from "next/server";
import { GrammyError } from "grammy";

import { errorResponse, parseBody, requireAdmin } from "@/lib/api-utils";
import { sendPromoTestPost } from "@/lib/market-promo";
import {
  marketPromoSettingsSchema,
  withChannelPrefix,
} from "@/lib/market-schemas";

function isChatNotFound(e: unknown) {
  return e instanceof GrammyError && /chat not found/i.test(e.description);
}

function failureMessage(e: unknown) {
  if (!(e instanceof GrammyError)) {
    return "Не удалось отправить сообщение";
  }
  if (isChatNotFound(e)) {
    return "Чат не найден. Для канала или супергруппы ID должен начинаться с -100, а бот должен быть добавлен туда участником";
  }
  if (/not enough rights|CHAT_WRITE_FORBIDDEN|bot was kicked/i.test(e.description)) {
    return "Бот не может писать в этот чат — дайте ему право отправлять сообщения";
  }
  if (/message thread not found/i.test(e.description)) {
    return "Тема с таким ID не найдена в этом чате";
  }
  return `Telegram отклонил отправку: ${e.description}`;
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const body = await parseBody(request, marketPromoSettingsSchema);
  if ("error" in body) return body.error;

  const settings = body.data;
  if (!settings.chatId) {
    return errorResponse("Укажите чат или канал для публикаций", 400);
  }

  const prefixed = withChannelPrefix(settings.chatId);
  const candidates = prefixed ? [settings.chatId, prefixed] : [settings.chatId];

  let lastError: unknown;
  for (const chatId of candidates) {
    try {
      await sendPromoTestPost({ ...settings, chatId });
      return NextResponse.json({ ok: true, chatId });
    } catch (e) {
      lastError = e;
      if (!isChatNotFound(e)) break;
    }
  }

  console.error("market promo test failed:", lastError);
  return errorResponse(failureMessage(lastError), 400);
}
