import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-utils";
import { getUniverseData } from "@/lib/queries";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;
  const { id } = await params;
  if (!id)
    return NextResponse.json(
      { error: "universeId params required" },
      {
        status: 400,
      }
    );

  const collection = await getUniverseData(userId, Number(id));
  return NextResponse.json(collection);
}
