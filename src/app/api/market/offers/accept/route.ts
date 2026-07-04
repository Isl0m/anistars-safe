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
  const { offer } = offerResult;

  const listingResult = await requireListingOwner(offer.listingId, sellerId);
  if ("error" in listingResult) return listingResult.error;

  if (listingResult.listing.status !== "active") {
    return errorResponse("Listing is not active", 400);
  }

  try {
    const result = await addMarketJob({
      type: "market-accept",
      offerId,
      sellerId,
    });
    revalidateMarketListings();
    return NextResponse.json(result);
  } catch (e) {
    console.error("market accept failed:", e);
    return errorResponse("Failed to process trade", 500);
  }
}
