import { NextResponse } from "next/server";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import { getMarketListing } from "@/lib/queries";

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

  const listing = await getMarketListing(id);
  if (!listing) {
    return errorResponse("Listing not found", 404);
  }

  return NextResponse.json({ listing });
}
