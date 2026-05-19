import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { marketOffers } from "@/db/schema/market";
import { updateMarketOfferStatus } from "@/lib/queries";

export async function POST(request: Request) {
  const body = await request.json();
  const { offerId, buyerId } = body;

  if (!offerId || !buyerId) {
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

  if (offer.buyerId !== buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (offer.status !== "pending") {
    return NextResponse.json(
      { error: "Offer is not pending" },
      { status: 400 }
    );
  }

  await updateMarketOfferStatus(offerId, "cancelled");

  return NextResponse.json({ success: true });
}
