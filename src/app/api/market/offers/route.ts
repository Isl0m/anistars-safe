import { NextResponse } from "next/server";
import {
  createMarketOffer,
  addMarketOfferCards,
  getMarketListing,
  verifyCardOwnership,
  getMarketOffersForListing,
} from "@/lib/queries";

export async function POST(request: Request) {
  const body = await request.json();
  const { listingId, buyerId, cardIds } = body;

  if (!listingId || !buyerId || !cardIds || cardIds.length === 0) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const listing = await getMarketListing(listingId);
  if (!listing) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404 }
    );
  }

  if (listing.status !== "active") {
    return NextResponse.json(
      { error: "Listing is no longer active" },
      { status: 400 }
    );
  }

  if (listing.sellerId === buyerId) {
    return NextResponse.json(
      { error: "Cannot make offer on your own listing" },
      { status: 400 }
    );
  }

  const uniqueCardIds = [...new Set(cardIds as string[])];

  const owned = await verifyCardOwnership(uniqueCardIds, buyerId);
  if (owned.length !== uniqueCardIds.length) {
    return NextResponse.json(
      { error: "You don't own all selected cards" },
      { status: 403 }
    );
  }

  const lockedCards = owned.filter((c) => c.isLocked);
  if (lockedCards.length > 0) {
    return NextResponse.json(
      { error: "Some cards are locked" },
      { status: 403 }
    );
  }

  if (listing.filters) {
    const { minCardCount, maxCardCount } = listing.filters;
    if (minCardCount && uniqueCardIds.length < minCardCount) {
      return NextResponse.json(
        { error: `Minimum ${minCardCount} cards required` },
        { status: 400 }
      );
    }
    if (maxCardCount && uniqueCardIds.length > maxCardCount) {
      return NextResponse.json(
        { error: `Maximum ${maxCardCount} cards allowed` },
        { status: 400 }
      );
    }
  }

  const existingOffers = await getMarketOffersForListing(listingId);
  const hasPendingOffer = existingOffers.some(
    (o) => o.buyerId === buyerId && o.status === "pending"
  );
  if (hasPendingOffer) {
    return NextResponse.json(
      { error: "You already have a pending offer on this listing" },
      { status: 409 }
    );
  }

  const [offer] = await createMarketOffer({
    listingId,
    buyerId,
    status: "pending",
  });

  await addMarketOfferCards(offer.id, uniqueCardIds);

  return NextResponse.json({ offer });
}
