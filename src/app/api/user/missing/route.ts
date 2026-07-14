import { NextResponse } from "next/server";

import { getRequiredParam, requireAuth, requireUser } from "@/lib/api-utils";
import {
  getUserMissingCardsPaginated,
  getUserMissingCardsWithFilter,
} from "@/lib/queries";
import { parseFilter } from "@/lib/utils";

import { Filter } from "@/components/get-filter-options";

export async function POST(request: Request) {
  const param = getRequiredParam(request, "id");
  if ("error" in param) return param.error;

  const result = await requireUser(param.value);
  if ("error" in result) return result.error;

  const body = (await request.json()) as Filter | undefined;
  const cards = await getUserMissingCardsWithFilter(
    param.value,
    body ?? undefined
  );

  return NextResponse.json({ user: result.user, cards });
}

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const { searchParams } = new URL(request.url);
  const filter = parseFilter(searchParams);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  const result = await requireUser(userId);
  if ("error" in result) return result.error;

  const { cards, total } = await getUserMissingCardsPaginated(
    userId,
    filter,
    page
  );

  return NextResponse.json({ cards, total, user: result.user });
}
