import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-utils";
import { getUserStandings } from "@/lib/queries";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;

  const standings = await getUserStandings(authResult.auth.id);
  return NextResponse.json({ standings });
}
