import { NextResponse } from "next/server";
import {
  getMarketListings,
  createMarketListing,
  addMarketListingCards,
  validateCardsForTrade,
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

  const validation = await validateCardsForTrade(cardIds, sellerId);
  if ("error" in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  const [listing] = await createMarketListing({
    sellerId,
    filters,
    status: "active",
  });

  await addMarketListingCards(listing.id, validation.cardIds);

  return NextResponse.json({ listing });
}
