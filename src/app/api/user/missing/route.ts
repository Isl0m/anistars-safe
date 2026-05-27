import { NextResponse } from "next/server";

import { getRequiredParam } from "@/lib/api-utils";
import { getUser, getUserMissingCardsWithFilter } from "@/lib/queries";

import { Filter } from "@/components/get-filter-options";

export async function POST(request: Request) {
  const param = getRequiredParam(request, "id");
  if ("error" in param) return param.error;

  const user = await getUser(param.value);
  if (!user)
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  const body = (await request.json()) as Filter | undefined;
  const cards = await getUserMissingCardsWithFilter(param.value, body ?? undefined);

  return NextResponse.json({ user, cards });
}
