import { NextResponse } from "next/server";

import { getRequiredParam, requireUser } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/telegram-auth";
import { getUserBanner, getUserProfileStats } from "@/lib/queries";

export async function GET(request: Request) {
  const param = getRequiredParam(request, "id");
  if ("error" in param) return param.error;

  const result = await requireUser(param.value);
  if ("error" in result) return result.error;
  const { user } = result;

  const auth = authenticateRequest(request);
  const isOwner = auth?.id === param.value;

  const [stats, banner] = await Promise.all([
    getUserProfileStats(param.value, isOwner),
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
