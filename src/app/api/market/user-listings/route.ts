import { NextResponse } from "next/server";

import { getRequiredParam } from "@/lib/api-utils";
import { getUserMarketListings } from "@/lib/queries";

export async function GET(request: Request) {
  const param = getRequiredParam(request, "id");
  if ("error" in param) return param.error;

  const status = new URL(request.url).searchParams.get("status");
  const listings = await getUserMarketListings(
    param.value,
    status === "inactive" ? { status: "inactive" } : undefined
  );
  return NextResponse.json({ listings });
}
