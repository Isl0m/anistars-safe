import { NextResponse } from "next/server";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import {
  addMarketOfferCards,
  createMarketOffer,
  getMarketListingMeta,
  hasPendingOfferFromBuyer,
  validateCardsForTrade,
} from "@/lib/queries";

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const buyerId = authResult.auth.id;

  const { listingId, cardIds } = await request.json();

  if (!listingId || !cardIds || cardIds.length === 0) {
    return errorResponse("Missing required fields", 400);
  }

  const listing = await getMarketListingMeta(listingId);
  if (!listing) {
    return errorResponse("Listing not found", 404);
  }

  if (listing.status !== "active") {
    return errorResponse("Listing is no longer active", 400);
  }

  if (listing.sellerId === buyerId) {
    return errorResponse("Cannot make offer on your own listing", 400);
  }

  const validation = await validateCardsForTrade(cardIds, buyerId);
  if (!validation.ok) {
    return errorResponse(validation.error, validation.status);
  }

  if (listing.filters) {
    const { minCardCount, maxCardCount } = listing.filters;
    if (minCardCount && validation.cardIds.length < minCardCount) {
      return errorResponse(`Minimum ${minCardCount} cards required`, 400);
    }
    if (maxCardCount && validation.cardIds.length > maxCardCount) {
      return errorResponse(`Maximum ${maxCardCount} cards allowed`, 400);
    }
  }

  const hasPendingOffer = await hasPendingOfferFromBuyer(listingId, buyerId);
  if (hasPendingOffer) {
    return errorResponse(
      "You already have a pending offer on this listing",
      409
    );
  }

  const [offer] = await createMarketOffer({
    listingId,
    buyerId,
    status: "pending",
  });

  await addMarketOfferCards(offer.id, validation.cardIds);

  return NextResponse.json({ offer });
}
