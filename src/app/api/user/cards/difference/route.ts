import { NextResponse } from "next/server";

import {
  errorResponse,
  getRequiredParam,
  requireAuth,
  requireUser,
} from "@/lib/api-utils";
import {
  getUserCardsDifferencePaginated,
  getUserCardsDifferenceWithFilter,
  getUserReservedCardIds,
} from "@/lib/queries";
import { parseFilter } from "@/lib/utils";

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

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const { searchParams } = new URL(request.url);
  const filter = parseFilter(searchParams);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const paramSecond = getRequiredParam(request, "secondId");
  if ("error" in paramSecond) return paramSecond.error;

  const { cards, total } = await getUserCardsDifferencePaginated(
    userId,
    paramSecond.value,
    filter,
    page
  );

  return NextResponse.json({ cards, total });
}
