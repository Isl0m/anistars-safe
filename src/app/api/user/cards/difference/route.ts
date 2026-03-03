import { NextResponse } from "next/server";

import { getUser, getUserCardsDifferenceWithFilter } from "@/lib/queries";

import { Filter, getUserFilterOptions } from "@/components/get-filte-options";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const secondId = searchParams.get("secondId");
  if (!id || !secondId)
    return NextResponse.json(
      { error: "id and secondId param required" },
      {
        status: 400,
      }
    );
  const user = await getUser(id);
  if (!user)
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  const body = (await request.json()) as Filter | undefined;
  const cards = await getUserCardsDifferenceWithFilter(
    id,
    secondId,
    body ?? undefined
  );
  const filterOptions = await getUserFilterOptions(id);
  return NextResponse.json({
    user,
    cards,
    filterOptions,
  });
}
