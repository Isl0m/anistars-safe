import { NextResponse } from "next/server";

import { getUniverseData } from "@/lib/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const { id } = await params;
  if (!userId || !id)
    return NextResponse.json(
      { error: "userId and universeId params required" },
      {
        status: 400,
      }
    );

  const collection = await getUniverseData(userId, Number(id));
  return NextResponse.json(collection);
}
