import { NextResponse } from "next/server";

import { getBanners } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json(
      { error: "userId param required" },
      {
        status: 400,
      }
    );
  }

  const banners = await getBanners(userId);
  return NextResponse.json({
    banners,
  });
}
