import { NextResponse } from "next/server";

import { getMarketListingMeta, revalidateMarketListings } from "@/lib/queries";
import { errorResponse, requireAuth } from "@/lib/api-utils";
import { addMarketJob } from "@/lib/trade-queue";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const sellerId = authResult.auth.id;

  const listingId = parseInt(params.id);
  const listing = await getMarketListingMeta(listingId);

  if (!listing) {
    return errorResponse("Listing not found", 404);
  }

  if (listing.sellerId !== sellerId) {
    return errorResponse("Forbidden", 403);
  }

  if (listing.status !== "active") {
    return errorResponse("Listing is not active", 400);
  }

  try {
    await addMarketJob({
      type: "market-cancel-listing",
      listingId,
      sellerId,
    });
    revalidateMarketListings();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("market cancel listing failed:", e);
    return errorResponse("Failed to cancel listing", 500);
  }
}
