import { NextResponse } from "next/server";

import { requireAuth, requireUser } from "@/lib/api-utils";
import { getUserBanner, getUserProfileStats } from "@/lib/queries";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const profileId = id || userId;
  const result = await requireUser(profileId);
  if ("error" in result) return result.error;
  const { user } = result;

  const isOwner = userId === id;

  const [stats, banner] = await Promise.all([
    getUserProfileStats(profileId, isOwner),
    getUserBanner(user.bannerId),
  ]);

  if (isOwner) {
    return NextResponse.json({ user, stats, banner });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      tgUserName: user.tgUserName,
      photoUrl: user.photoUrl,
      type: user.type,
      isPremium: user.isPremium,
      createdAt: user.createdAt,
      bannerId: user.bannerId,
    },
    stats: {
      totalCards: stats.totalCards,
      totalValue: stats.totalValue,
    },
    banner,
  });
}
