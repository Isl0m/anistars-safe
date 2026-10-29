import { NextResponse } from "next/server";

import { getAnalytics } from "@/lib/admin/analytics";
import { requireOwner } from "@/lib/admin/api";

const ALLOWED_DAYS = [7, 30, 90];

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const days = Number(new URL(request.url).searchParams.get("days"));
  const analytics = await getAnalytics(ALLOWED_DAYS.includes(days) ? days : 30);
  return NextResponse.json({ analytics });
}
