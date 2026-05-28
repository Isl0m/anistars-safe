import { NextResponse } from "next/server";

import { getMarketListing, updateUserPhotoUrl } from "@/lib/queries";
import { authenticateRequest } from "@/lib/telegram-auth";
import { addMarketJob } from "@/lib/trade-queue";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const sellerId = auth.id;
  updateUserPhotoUrl(sellerId, auth.photoUrl);

  const { id } = params;
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

  try {
    await addMarketJob({
      type: "market-cancel-listing",
      listingId,
      sellerId,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to cancel listing" },
      { status: 500 }
    );
  }
}
