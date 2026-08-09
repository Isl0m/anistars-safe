import { NextResponse } from "next/server";

import { errorResponse, parseBody, requireAdmin } from "@/lib/api-utils";
import { sendPromoTestPost } from "@/lib/market-promo";
import { marketPromoSettingsSchema } from "@/lib/market-schemas";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const body = await parseBody(request, marketPromoSettingsSchema);
  if ("error" in body) return body.error;

  if (!body.data.chatId) {
    return errorResponse("Укажите чат или канал для публикаций", 400);
  }

  try {
    await sendPromoTestPost(body.data);
  } catch (e) {
    console.error("market promo test failed:", e);
    return errorResponse(
      "Не удалось отправить сообщение. Проверьте, что бот добавлен в чат и может писать",
      400
    );
  }

  return NextResponse.json({ ok: true });
}
