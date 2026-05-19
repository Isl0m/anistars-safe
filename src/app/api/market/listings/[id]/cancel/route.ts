import { NextResponse } from "next/server";

import {
  getMarketListing,
  updateMarketListingStatus,
  cancelPendingOffersForListing,
} from "@/lib/queries";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json();
  const { sellerId } = body;

  if (!sellerId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const listingId = parseInt(id);
  const listing = await getMarketListing(listingId);

  if (!listing) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404 }
    );
  }

  if (listing.sellerId !== sellerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (listing.status !== "active") {
    return NextResponse.json(
      { error: "Listing is not active" },
      { status: 400 }
    );
  }

  await updateMarketListingStatus(listingId, "cancelled");
  await cancelPendingOffersForListing(listingId);

  return NextResponse.json({ success: true });
}
