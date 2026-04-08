import { NextResponse } from "next/server";
import { getMarketListings, createMarketListing, addMarketListingCards } from "@/lib/queries";

export async function GET() {
  const listings = await getMarketListings();
  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { sellerId, cardIds, filters } = body;

  if (!sellerId || !cardIds || cardIds.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [listing] = await createMarketListing({
    sellerId,
    filters,
    status: "active",
  });

  await addMarketListingCards(listing.id, cardIds);

  return NextResponse.json({ listing });
}
