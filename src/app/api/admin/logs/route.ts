import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/admin/api";
import { listAdminLogs } from "@/lib/admin/queries";

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const page = Math.max(
    1,
    Math.floor(Number(new URL(request.url).searchParams.get("page")) || 1)
  );
  return NextResponse.json(await listAdminLogs(page));
}
