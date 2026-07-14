import { NextResponse } from "next/server";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import { MAX_LISTING_CARDS } from "@/lib/constants";
import {
  addMarketListingCards,
  createMarketListing,
  getMarketListings,
  validateCardsForTrade,
} from "@/lib/queries";

export async function GET() {
  const listings = await getMarketListings();
  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const sellerId = authResult.auth.id;

  const { cardIds, filters } = await request.json();

  if (!cardIds || cardIds.length === 0) {
    return errorResponse("Missing required fields", 400);
  }
  if (cardIds.length > MAX_LISTING_CARDS) {
    return errorResponse(
      `A listing can contain at most ${MAX_LISTING_CARDS} cards`,
      400
    );
  }

  const validation = await validateCardsForTrade(cardIds, sellerId);
  if (!validation.ok) {
    return errorResponse(validation.error, validation.status);
  }

  // The buyer's offer can include at most MAX_LISTING_CARDS cards, so cap the
  // seller's requested maximum to that limit (default to it when unset).
  const normalizedFilters = filters
    ? {
        ...filters,
        maxCardCount: Math.min(
          filters.maxCardCount ?? MAX_LISTING_CARDS,
          MAX_LISTING_CARDS
        ),
      }
    : filters;

  const [listing] = await createMarketListing({
    sellerId,
    filters: normalizedFilters,
    status: "active",
  });

  await addMarketListingCards(listing.id, validation.cardIds);

  return NextResponse.json({ listing });
}
