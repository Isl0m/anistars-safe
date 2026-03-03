import { NextResponse } from "next/server";

import { userTradeHistory } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  const tradeHistory = await userTradeHistory(id);
  if (!tradeHistory)
    return NextResponse.json(
      { error: "trade history not found" },
      { status: 404 }
    );
  return NextResponse.json({
    tradeHistory,
  });
}
