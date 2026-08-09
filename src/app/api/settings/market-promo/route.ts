import { NextResponse } from "next/server";

import { errorResponse, parseBody, requireAdmin } from "@/lib/api-utils";
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

  if (body.data.enabled && !body.data.chatId) {
    return errorResponse("Укажите чат или канал для публикаций", 400);
  }

  await setMarketPromoSettings(body.data);
  return NextResponse.json({ settings: body.data });
}
