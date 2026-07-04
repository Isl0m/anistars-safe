import { NextResponse } from "next/server";

import { revalidateMarketListings } from "@/lib/queries";
import {
  errorResponse,
  loadPendingOffer,
  requireAuth,
  requireListingOwner,
} from "@/lib/api-utils";
import { addMarketJob } from "@/lib/trade-queue";

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const sellerId = authResult.auth.id;

  const { offerId } = await request.json();

  const offerResult = await loadPendingOffer(offerId);
  if ("error" in offerResult) return offerResult.error;

  const listingResult = await requireListingOwner(
    offerResult.offer.listingId,
    sellerId
  );
  if ("error" in listingResult) return listingResult.error;

  try {
    await addMarketJob({ type: "market-reject-offer", offerId, sellerId });
    revalidateMarketListings();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("market reject offer failed:", e);
    return errorResponse("Failed to reject offer", 500);
  }
}
