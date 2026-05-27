import { NextResponse } from "next/server";

import { getMarketOffer } from "@/lib/queries";
import { authenticateRequest } from "@/lib/telegram-auth";
import { addMarketJob } from "@/lib/trade-queue";

export async function POST(request: Request) {
  const buyerId = authenticateRequest(request);
  if (!buyerId) {
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

  if (offer.buyerId !== buyerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (offer.status !== "pending") {
    return NextResponse.json(
      { error: "Offer is not pending" },
      { status: 400 }
    );
  }

  try {
    await addMarketJob({ type: "market-cancel-offer", offerId, buyerId });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to cancel offer" },
      { status: 500 }
    );
  }
}
