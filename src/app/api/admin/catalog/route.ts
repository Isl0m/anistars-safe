import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/admin/api";
import { getCatalog } from "@/lib/admin/queries";

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;
  return NextResponse.json(await getCatalog());
}
