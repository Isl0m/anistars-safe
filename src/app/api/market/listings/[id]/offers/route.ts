import { NextResponse } from "next/server";

import { getMarketListingMeta, getMarketOffersForListing } from "@/lib/queries";
import { authenticateRequest } from "@/lib/telegram-auth";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const auth = authenticateRequest(request);
  const listing = await getMarketListingMeta(id);

  const sellerId =
    auth &&
    listing &&
    listing.status === "active" &&
    auth.id === listing.sellerId
      ? listing.sellerId
      : undefined;

  const offers = await getMarketOffersForListing(id, sellerId);
  return NextResponse.json({ offers });
}
