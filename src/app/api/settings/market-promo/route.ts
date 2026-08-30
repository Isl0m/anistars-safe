import { NextResponse } from "next/server";

import { errorResponse, parseBody, requireAdmin } from "@/lib/api-utils";
import { chatErrorMessage, resolveChatId } from "@/lib/market-promo";
import { marketPromoSettingsSchema } from "@/lib/market-schemas";
import { getMarketPromoSettings, setMarketPromoSettings } from "@/lib/queries";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  return NextResponse.json({ settings: await getMarketPromoSettings() });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const body = await parseBody(request, marketPromoSettingsSchema);
  if ("error" in body) return body.error;

  const settings = body.data;
  if (settings.enabled && !settings.chatId) {
    return errorResponse("Укажите чат или канал для публикаций", 400);
  }

  let warning: string | undefined;
  if (settings.chatId) {
    const resolved = await resolveChatId(settings.chatId).catch((e) => ({
      chatId: null,
      error: e,
    }));
    if (resolved.chatId) {
      settings.chatId = resolved.chatId;
    } else {
      warning = chatErrorMessage(resolved.error);
      console.error("market promo chat unreachable:", resolved.error);
    }
  }

  await setMarketPromoSettings(settings);
  return NextResponse.json({ settings, warning });
}
