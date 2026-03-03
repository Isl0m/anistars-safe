import { NextResponse } from "next/server";

import { getUser, getUserMissingCardsWithFilter } from "@/lib/queries";

import { Filter } from "@/components/get-filte-options";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id param required" }, { status: 400 });
  const user = await getUser(id);
  if (!user)
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  const body = (await request.json()) as Filter | undefined;
  const cards = await getUserMissingCardsWithFilter(id, body ?? undefined);

  return NextResponse.json({
    user,
    cards,
  });
}
