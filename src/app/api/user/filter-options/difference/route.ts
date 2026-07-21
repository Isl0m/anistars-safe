import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api-utils";

import { getDiffFilterOptions } from "@/components/get-filter-options";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const diffId = searchParams.get("diffId");
  if (!id || !diffId) {
    return errorResponse(`id and diffId param required`, 400);
  }

  const filterOptions = await getDiffFilterOptions(id, diffId);
  return NextResponse.json({ filterOptions });
}
