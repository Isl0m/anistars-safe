import { NextResponse } from "next/server";

import { requireAuth, requireUser } from "@/lib/api-utils";
import { getUserCardsPaginated } from "@/lib/queries";
import { parseFilter } from "@/lib/utils";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const { searchParams } = new URL(request.url);

  const filter = parseFilter(searchParams);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const id = searchParams.get("id");
  const cardsUserId = id || userId;

  // Kept for the 404 when the id does not exist. The row itself is deliberately
  // not returned: `id` is caller-supplied, so echoing the full user row handed
  // any authenticated user another player's coins, astrals, moderation flags
  // and admin status. No caller ever read it.
  const result = await requireUser(cardsUserId);
  if ("error" in result) return result.error;

  const { cards, total } = await getUserCardsPaginated(
    cardsUserId,
    filter,
    page
  );
  return NextResponse.json({ cards, total });
}
