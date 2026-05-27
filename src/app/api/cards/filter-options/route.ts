import { NextResponse } from "next/server";
import { getFilterOptions } from "@/components/get-filter-options";

export async function GET() {
  const filterOptions = await getFilterOptions();
  return NextResponse.json({ filterOptions });
}
