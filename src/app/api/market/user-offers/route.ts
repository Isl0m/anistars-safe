import { NextResponse } from "next/server";

import { getRequiredParam } from "@/lib/api-utils";
import { getUserMarketOffers } from "@/lib/queries";

export async function GET(request: Request) {
  const param = getRequiredParam(request, "id");
  if ("error" in param) return param.error;

  const offers = await getUserMarketOffers(param.value);
  return NextResponse.json({ offers });
}
