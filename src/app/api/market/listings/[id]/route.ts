import { NextResponse } from "next/server";
import { getMarketListing } from "@/lib/queries";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = parseInt(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const listing = await getMarketListing(id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json({ listing });
}
