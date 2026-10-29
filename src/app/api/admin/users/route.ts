import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/admin/api";
import { searchUsers, USER_FILTERS, UserFilter } from "@/lib/admin/queries";

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").slice(0, 64);
  const rawFilter = params.get("filter") as UserFilter;
  const filter = USER_FILTERS.includes(rawFilter) ? rawFilter : "recent";
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));

  return NextResponse.json(await searchUsers(q, filter, page));
}
