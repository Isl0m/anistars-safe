import { NextResponse } from "next/server";

import { revalidateMarketListings } from "@/lib/queries";
import { errorResponse, loadPendingOffer, requireAuth } from "@/lib/api-utils";
import { addMarketJob } from "@/lib/trade-queue";

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const buyerId = authResult.auth.id;

  const { offerId } = await request.json();

  const offerResult = await loadPendingOffer(offerId);
  if ("error" in offerResult) return offerResult.error;

  if (offerResult.offer.buyerId !== buyerId) {
    return errorResponse("Forbidden", 403);
  }

  try {
    await addMarketJob({ type: "market-cancel-offer", offerId, buyerId });
    revalidateMarketListings();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("market cancel offer failed:", e);
    return errorResponse("Failed to cancel offer", 500);
  }
}
