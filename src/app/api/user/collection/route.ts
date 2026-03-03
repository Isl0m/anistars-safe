import { NextResponse } from "next/server";

import { getUserCollection } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { error: "id param required" },
      {
        status: 400,
      }
    );

  const collection = await getUserCollection(id);
  return NextResponse.json({ collection });
}
