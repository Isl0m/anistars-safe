import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-utils";
import { getUserMarketListings } from "@/lib/queries";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const status = new URL(request.url).searchParams.get("status");
  const listings = await getUserMarketListings(
    userId,
    status === "inactive" ? { status: "inactive" } : undefined
  );
  return NextResponse.json({ listings });
}
