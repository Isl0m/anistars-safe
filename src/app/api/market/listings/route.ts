import { NextResponse } from "next/server";

import {
  errorResponse,
  parseBody,
  requireMarketAccess,
} from "@/lib/api-utils";
import { MAX_ACTIVE_LISTINGS, MAX_LISTING_CARDS } from "@/lib/constants";
import { createListingSchema } from "@/lib/market-schemas";
import {
  addMarketListingCards,
  countActiveListings,
  createMarketListing,
  getMarketListings,
  getUser,
  validateCardsForTrade,
} from "@/lib/queries";

export async function GET(request: Request) {
  const authResult = await requireMarketAccess(request);
  if ("error" in authResult) return authResult.error;

  const listings = await getMarketListings();
  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  const authResult = await requireMarketAccess(request);
  if ("error" in authResult) return authResult.error;
  const sellerId = authResult.auth.id;

  const body = await parseBody(request, createListingSchema);
  if ("error" in body) return body.error;
  const { cardIds, filters } = body.data;

  const seller = await getUser(sellerId);
  if (!seller) return errorResponse("user not found", 404);

  const listingLimit = seller.isPremium
    ? MAX_ACTIVE_LISTINGS.premium
    : MAX_ACTIVE_LISTINGS.basic;
  const activeListings = await countActiveListings(sellerId);
  if (activeListings >= listingLimit) {
    return errorResponse(
      `You can have at most ${listingLimit} active listings`,
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
