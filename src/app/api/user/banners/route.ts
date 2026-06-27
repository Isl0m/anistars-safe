import { NextResponse } from "next/server";

import { getUserBanners } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId)
    return NextResponse.json(
      { error: "userId is not provided" },
      { status: 404 }
    );

  const banners = await getUserBanners(userId);
  return NextResponse.json({
    banners,
  });
}
