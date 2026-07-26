import { NextResponse } from "next/server";

import { requireMarketAccess } from "@/lib/api-utils";
import { getUserMarketOffers } from "@/lib/queries";

export async function GET(request: Request) {
  const authResult = await requireMarketAccess(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const offers = await getUserMarketOffers(userId);
  return NextResponse.json({ offers });
}
