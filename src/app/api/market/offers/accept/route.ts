import { NextResponse } from "next/server";

import {
  getMarketListingMeta,
  getMarketOffer,
  revalidateMarketListings,
} from "@/lib/queries";
import { errorResponse, requireAuth } from "@/lib/api-utils";
import { addMarketJob } from "@/lib/trade-queue";

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const sellerId = authResult.auth.id;

  const { offerId } = await request.json();

  if (!offerId) {
    return errorResponse("Missing required fields", 400);
  }

  const offer = await getMarketOffer(offerId);

  if (!offer) {
    return errorResponse("Offer not found", 404);
  }

  if (offer.status !== "pending") {
    return errorResponse("Offer is not pending", 400);
  }

  const listing = await getMarketListingMeta(offer.listingId);
  if (!listing || listing.sellerId !== sellerId) {
    return errorResponse("Forbidden", 403);
  }

  if (listing.status !== "active") {
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
