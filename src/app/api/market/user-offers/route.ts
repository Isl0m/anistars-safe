import { NextResponse } from "next/server";
import { getUserMarketOffers } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id param required" }, { status: 400 });

  const offers = await getUserMarketOffers(id);
  return NextResponse.json({ offers });
}
