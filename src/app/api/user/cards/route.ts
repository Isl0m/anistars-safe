import { NextResponse } from "next/server";

import { getUser, getUserCardsWithFilter } from "@/lib/queries";

import { Filter, getUserFilterOptions } from "@/components/get-filte-options";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { eror: "id param required" },
      {
        status: 400,
      }
    );
  const user = await getUser(id);
  if (!user)
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  const body = (await request.json()) as Filter | undefined;
  const cards = await getUserCardsWithFilter(id, body ?? undefined);
  const filterOptions = await getUserFilterOptions(id);
  return NextResponse.json({
    user,
    cards,
    filterOptions,
  });
}
