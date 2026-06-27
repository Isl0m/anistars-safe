import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-utils";

export async function POST(request: Request) {
  // requireAuth validates the init data and refreshes the cached photo, which
  // is exactly what this endpoint exists to do.
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;

  return NextResponse.json({ success: true });
}
