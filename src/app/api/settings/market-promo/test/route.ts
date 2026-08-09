import { NextResponse } from "next/server";

import { errorResponse, parseBody, requireAdmin } from "@/lib/api-utils";
import { chatErrorMessage, sendPromoTestPost } from "@/lib/market-promo";
import { marketPromoSettingsSchema } from "@/lib/market-schemas";

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const body = await parseBody(request, marketPromoSettingsSchema);
  if ("error" in body) return body.error;

  const settings = body.data;
  if (!settings.chatId) {
    return errorResponse("Укажите чат или канал для публикаций", 400);
  }

  try {
    const chatId = await sendPromoTestPost(settings);
    return NextResponse.json({ ok: true, chatId });
  } catch (e) {
    console.error("market promo test failed:", e);
    return errorResponse(chatErrorMessage(e), 400);
  }
}
