import { NextResponse } from "next/server";
import {
  getMarketListings,
  createMarketListing,
  addMarketListingCards,
  verifyCardOwnership,
} from "@/lib/queries";

export async function GET() {
  const listings = await getMarketListings();
  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { sellerId, cardIds, filters } = body;

  if (!sellerId || !cardIds || cardIds.length === 0) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const uniqueCardIds = [...new Set(cardIds as string[])];
  if (uniqueCardIds.length !== cardIds.length) {
    return NextResponse.json(
      { error: "Duplicate card IDs" },
      { status: 400 }
    );
  }

  const owned = await verifyCardOwnership(uniqueCardIds, sellerId);
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

  const [listing] = await createMarketListing({
    sellerId,
    filters,
    status: "active",
  });

  await addMarketListingCards(listing.id, uniqueCardIds);

  return NextResponse.json({ listing });
}
