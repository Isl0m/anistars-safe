import { NextResponse } from "next/server";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import { getMarketListingMeta, getMarketOffersForListing } from "@/lib/queries";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;

  const params = await props.params;
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return errorResponse("Invalid id", 400);
  }

  const listing = await getMarketListingMeta(id);

  const sellerId =
    listing &&
    listing.status === "active" &&
    authResult.auth.id === listing.sellerId
      ? listing.sellerId
      : undefined;

  const offers = await getMarketOffersForListing(id, sellerId);
  return NextResponse.json({ offers });
}
