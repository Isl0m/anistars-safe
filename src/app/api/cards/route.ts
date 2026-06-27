import { NextResponse } from "next/server";

import { getCardsFullWithFilter } from "@/lib/queries";

import { Filter } from "@/components/get-filter-options";

function parseFilter(searchParams: URLSearchParams): Filter | undefined {
  const raw = searchParams.get("filter");
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Filter;
  } catch {
    return undefined;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filter = parseFilter(searchParams);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  const { cards, total } = await getCardsFullWithFilter(filter, page);

  return NextResponse.json(
    { cards, total },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    }
  );
}
