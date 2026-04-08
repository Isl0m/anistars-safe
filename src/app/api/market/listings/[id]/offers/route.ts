import { NextResponse } from "next/server";
import { getMarketOffersForListing } from "@/lib/queries";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const offers = await getMarketOffersForListing(id);
  return NextResponse.json({ offers });
}
