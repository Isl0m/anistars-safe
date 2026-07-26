import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-utils";
import { getUserMarketOffers } from "@/lib/queries";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const offers = await getUserMarketOffers(userId);
  return NextResponse.json({ offers });
}
