import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-utils";

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;

  return NextResponse.json({ success: true });
}
