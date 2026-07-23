import { NextResponse } from "next/server";

import { requireAuth, requireUser } from "@/lib/api-utils";
import { getUserMissingCardsPaginated } from "@/lib/queries";
import { parseFilter } from "@/lib/utils";

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
