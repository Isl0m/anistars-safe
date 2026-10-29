import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/admin/api";
import { countAudience } from "@/lib/admin/queries";

const AUDIENCES = ["all", "active1", "active7", "active30", "premium"];

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const entries = await Promise.all(
    AUDIENCES.map(async (a) => [a, await countAudience(a)] as const)
  );
  return NextResponse.json({
    counts: { ...Object.fromEntries(entries), me: 1 },
  });
}
