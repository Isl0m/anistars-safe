import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-utils";
import { userTradeHistory } from "@/lib/queries";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const tradeHistory = await userTradeHistory(userId);
  if (!tradeHistory)
    return NextResponse.json(
      { error: "trade history not found" },
      { status: 404 }
    );
  return NextResponse.json(tradeHistory);
}
