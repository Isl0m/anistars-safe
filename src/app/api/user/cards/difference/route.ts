import { NextResponse } from "next/server";

import { getRequiredParam, requireAuth } from "@/lib/api-utils";
import { getUserCardsDifferencePaginated } from "@/lib/queries";
import { parseFilter } from "@/lib/utils";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const { searchParams } = new URL(request.url);
  const filter = parseFilter(searchParams);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const paramSecond = getRequiredParam(request, "secondId");
  if ("error" in paramSecond) return paramSecond.error;

  const { cards, total } = await getUserCardsDifferencePaginated(
    userId,
    paramSecond.value,
    filter,
    page
  );

  return NextResponse.json({ cards, total });
}
