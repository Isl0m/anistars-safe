import { NextResponse } from "next/server";
import { createMarketOffer, addMarketOfferCards } from "@/lib/queries";

export async function POST(request: Request) {
  const body = await request.json();
  const { listingId, buyerId, cardIds } = body;

  if (!listingId || !buyerId || !cardIds || cardIds.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const [offer] = await createMarketOffer({
    listingId,
    buyerId,
    status: "pending",
  });

  await addMarketOfferCards(offer.id, cardIds);

  return NextResponse.json({ offer });
}
