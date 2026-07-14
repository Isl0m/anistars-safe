import { NextResponse } from "next/server";

import { getCardsFullWithFilter } from "@/lib/queries";
import { parseFilter } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = parseFilter(searchParams);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  const { cards, total } = await getCardsFullWithFilter(filter, page);

  return NextResponse.json({ cards, total });
}
