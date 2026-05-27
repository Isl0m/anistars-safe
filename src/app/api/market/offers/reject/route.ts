import { NextResponse } from "next/server";

import { getMarketListing, getMarketOffer } from "@/lib/queries";
import { authenticateRequest } from "@/lib/telegram-auth";
import { addMarketJob } from "@/lib/trade-queue";

export async function POST(request: Request) {
  const sellerId = authenticateRequest(request);
  if (!sellerId) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { offerId } = body;

  if (!offerId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const offer = await getMarketOffer(offerId);

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

  try {
    await addMarketJob({ type: "market-reject-offer", offerId, sellerId });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to reject offer" },
      { status: 500 }
    );
  }
}
