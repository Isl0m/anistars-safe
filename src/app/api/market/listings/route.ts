import { NextResponse } from "next/server";
import {
  getCachedMarketListings,
  createMarketListing,
  addMarketListingCards,
  validateCardsForTrade,
  revalidateMarketListings,
} from "@/lib/queries";
import { errorResponse, requireAuth } from "@/lib/api-utils";

export async function GET() {
  const listings = await getCachedMarketListings();
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

  const validation = await validateCardsForTrade(cardIds, sellerId);
  if (!validation.ok) {
    return errorResponse(validation.error, validation.status);
  }

  const [listing] = await createMarketListing({
    sellerId,
    filters,
    status: "active",
  });

  await addMarketListingCards(listing.id, validation.cardIds);

  revalidateMarketListings();

  return NextResponse.json({ listing });
}
