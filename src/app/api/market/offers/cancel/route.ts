import { NextResponse } from "next/server";

import {
  errorResponse,
  loadPendingOffer,
  requireMarketAccess,
} from "@/lib/api-utils";
import { addMarketJob } from "@/lib/trade-queue";

export async function POST(request: Request) {
  const authResult = await requireMarketAccess(request);
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
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("market cancel offer failed:", e);
    return errorResponse("Failed to cancel offer", 500);
  }
}
