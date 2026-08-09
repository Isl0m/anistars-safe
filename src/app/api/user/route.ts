import { NextResponse } from "next/server";

import { requireAuth, requireUser } from "@/lib/api-utils";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const result = await requireUser(userId);
  if ("error" in result) return result.error;

  return NextResponse.json({ user: result.user });
}
