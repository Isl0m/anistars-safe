import { NextResponse } from "next/server";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import { getUserBanners, updateUserBanner } from "@/lib/queries";

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

export async function PATCH(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;

  const { bannerId } = await request.json();
  if (typeof bannerId !== "number") {
    return errorResponse("bannerId required", 400);
  }

  const result = await updateUserBanner(authResult.auth.id, bannerId);
  if (!result.ok) {
    return errorResponse(result.error, 400);
  }

  return NextResponse.json({ success: true, bannerId });
}
