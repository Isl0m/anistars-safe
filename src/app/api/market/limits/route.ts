import { NextResponse } from "next/server";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import { MAX_ACTIVE_LISTINGS, MAX_ACTIVE_OFFERS } from "@/lib/constants";
import { countActiveListings, countActiveOffers, getUser } from "@/lib/queries";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const user = await getUser(userId);
  if (!user) return errorResponse("user not found", 404);

  const [activeListings, activeOffers] = await Promise.all([
    countActiveListings(userId),
    countActiveOffers(userId),
  ]);

  const listingLimit = user.isPremium
    ? MAX_ACTIVE_LISTINGS.premium
    : MAX_ACTIVE_LISTINGS.basic;
  const offerLimit = user.isPremium
    ? MAX_ACTIVE_OFFERS.premium
    : MAX_ACTIVE_OFFERS.basic;

  return NextResponse.json({
    isPremium: user.isPremium,
    listings: {
      active: activeListings,
      limit: listingLimit,
      canCreate: activeListings < listingLimit,
    },
    offers: {
      active: activeOffers,
      limit: offerLimit,
      canCreate: activeOffers < offerLimit,
    },
  });
}
