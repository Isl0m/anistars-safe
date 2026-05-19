import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { marketOffers } from "@/db/schema/market";
import { getMarketListing, updateMarketOfferStatus } from "@/lib/queries";

export async function POST(request: Request) {
  const body = await request.json();
  const { offerId, sellerId } = body;

  if (!offerId || !sellerId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const [offer] = await db
    .select()
    .from(marketOffers)
    .where(eq(marketOffers.id, offerId));

  if (!offer) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  if (offer.status !== "pending") {
    return NextResponse.json(
      { error: "Offer is not pending" },
      { status: 400 }
    );
  }

  const listing = await getMarketListing(offer.listingId);
  if (!listing || listing.sellerId !== sellerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await updateMarketOfferStatus(offerId, "cancelled");

  return NextResponse.json({ success: true });
}
