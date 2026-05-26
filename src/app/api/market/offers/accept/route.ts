import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getMarketListing } from "@/lib/queries";
import { addMarketJob } from "@/lib/trade-queue";

import { db } from "@/db";
import { marketOffers } from "@/db/schema/market";

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

  if (listing.status !== "active") {
    return NextResponse.json(
      { error: "Listing is not active" },
      { status: 400 }
    );
  }

  try {
    const result = await addMarketJob({
      type: "market-accept",
      offerId,
      sellerId,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { error: "Failed to process trade" },
      { status: 500 }
    );
  }
}
