import { NextResponse } from "next/server";

import { errorResponse, requireUser } from "@/lib/api-utils";
import {
  getUserCardsDifferenceWithFilter,
  getUserReservedCardIds,
} from "@/lib/queries";

import { Filter, getUserFilterOptions } from "@/components/get-filter-options";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const secondId = searchParams.get("secondId");
  if (!id || !secondId)
    return errorResponse("id and secondId param required", 400);
  const result = await requireUser(id);
  if ("error" in result) return result.error;
  const { user } = result;
  const body = (await request.json()) as Filter | undefined;
  const [cards, filterOptions, reserved] = await Promise.all([
    getUserCardsDifferenceWithFilter(id, secondId, body ?? undefined),
    getUserFilterOptions(id),
    getUserReservedCardIds(id),
  ]);
  return NextResponse.json({
    user,
    cards,
    filterOptions,
    reserved,
  });
}
