import { NextResponse } from "next/server";

import { getRequiredParam, requireUser } from "@/lib/api-utils";
import { getUserMissingCardsWithFilter } from "@/lib/queries";

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
