import { NextResponse } from "next/server";

import { requireOwner } from "@/lib/admin/api";
import { searchCards } from "@/lib/admin/queries";

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ cards: [] });
  return NextResponse.json({ cards: await searchCards(q.slice(0, 64)) });
}
