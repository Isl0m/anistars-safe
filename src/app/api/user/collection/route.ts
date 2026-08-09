import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-utils";
import { getUserCollection } from "@/lib/queries";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const collection = await getUserCollection(userId);
  return NextResponse.json({ collection });
}
