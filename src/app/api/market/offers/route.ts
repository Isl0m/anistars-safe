import { NextResponse } from "next/server";

import {
  errorResponse,
  parseBody,
  requireAuth,
  revalidateMarketPages,
} from "@/lib/api-utils";
import { MAX_ACTIVE_OFFERS, MAX_LISTING_CARDS } from "@/lib/constants";
import { createOfferSchema } from "@/lib/market-schemas";
import {
  addMarketOfferCards,
  countActiveOffers,
  createMarketOffer,
  getCardIdsMatchingFilter,
  getMarketListingCardIds,
  getMarketListingMeta,
  getUser,
  hasPendingOfferFromBuyer,
  isTradeBanned,
  validateCardsForTrade,
} from "@/lib/queries";

import { listingFiltersToCardFilter } from "@/lib/listing-filter";

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const buyerId = authResult.auth.id;

  const body = await parseBody(request, createOfferSchema);
  if ("error" in body) return body.error;
  const { listingId, cardIds } = body.data;

  if (await isTradeBanned(buyerId)) {
    return errorResponse("Вы заблокированы в трейдах", 403);
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

  // Settlement treats a card present on both sides as a mutual duplicate and
  // converts both copies instead of transferring them — never allow overlap.
  const listingCardIds = new Set(await getMarketListingCardIds(listingId));
  if (validation.cardIds.some((id) => listingCardIds.has(id))) {
    return errorResponse(
      "В предложении есть карты, которые уже есть в самом лоте",
      400
    );
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

  // Card counts used to be the only requirement checked here. Rarity, class,
  // universe, type, stats and minimum price were enforced by the picker
  // greying out cards — which a request that does not come from the picker
  // simply skips, so the seller's stated terms were advisory.
  if (listing.filters) {
    const required = listingFiltersToCardFilter(listing.filters);
    const matching = await getCardIdsMatchingFilter(
      validation.cardIds,
      required
    );
    if (matching.size !== validation.cardIds.length) {
      return errorResponse(
        "Некоторые карты не соответствуют условиям лота",
        400
      );
    }
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

  revalidateMarketPages(listingId);
  return NextResponse.json({ offer });
}
