import { NextResponse } from "next/server";

import {
  errorResponse,
  parseBody,
  requireAuth,
} from "@/lib/api-utils";
import { MAX_ACTIVE_OFFERS, MAX_LISTING_CARDS } from "@/lib/constants";
import { createOfferSchema } from "@/lib/market-schemas";
import {
  addMarketOfferCards,
  countActiveOffers,
  createMarketOffer,
  getMarketListingMeta,
  getUser,
  hasPendingOfferFromBuyer,
  validateCardsForTrade,
} from "@/lib/queries";

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const buyerId = authResult.auth.id;

  const body = await parseBody(request, createOfferSchema);
  if ("error" in body) return body.error;
  const { listingId, cardIds } = body.data;

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

  // The hard cap applies whether or not the seller set filters — a listing
  // created without them used to accept an offer of unbounded size, which
  // fans out into per-card ownership queries and an unbounded transaction.
  const maxCardCount = Math.min(
    listing.filters?.maxCardCount ?? MAX_LISTING_CARDS,
    MAX_LISTING_CARDS
  );
  if (validation.cardIds.length > maxCardCount) {
    return errorResponse(`Максимум ${maxCardCount} карт в предложении`, 400);
  }

  const minCardCount = listing.filters?.minCardCount;
  if (minCardCount && validation.cardIds.length < minCardCount) {
    return errorResponse(`Минимум ${minCardCount} карт в предложении`, 400);
  }

  const hasPendingOffer = await hasPendingOfferFromBuyer(listingId, buyerId);
  if (hasPendingOffer) {
    return errorResponse(
      "You already have a pending offer on this listing",
      409
    );
  }

  const buyer = await getUser(buyerId);
  if (!buyer) return errorResponse("user not found", 404);

  const offerLimit = buyer.isPremium
    ? MAX_ACTIVE_OFFERS.premium
    : MAX_ACTIVE_OFFERS.basic;
  const activeOffers = await countActiveOffers(buyerId);
  if (activeOffers >= offerLimit) {
    return errorResponse(
      `You can have at most ${offerLimit} active offers`,
      400
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
