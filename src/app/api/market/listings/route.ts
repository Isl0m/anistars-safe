import { NextResponse } from "next/server";
import {
  getMarketListings,
  createMarketListing,
  addMarketListingCards,
  validateCardsForTrade,
  updateUserPhotoUrl,
} from "@/lib/queries";
import { authenticateRequest } from "@/lib/telegram-auth";

export async function GET() {
  const listings = await getMarketListings();
  return NextResponse.json({ listings });
}

export async function POST(request: Request) {
  const auth = authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const sellerId = auth.id;
  updateUserPhotoUrl(sellerId, auth.photoUrl);

  const body = await request.json();
  const { cardIds, filters } = body;

  if (!cardIds || cardIds.length === 0) {
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
