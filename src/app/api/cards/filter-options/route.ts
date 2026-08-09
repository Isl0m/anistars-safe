import { NextResponse } from "next/server";

import {
  getFilterOptions,
  getListingFilterOptions,
} from "@/components/get-filter-options";

export async function GET(request: Request) {
  const wantsListing = new URL(request.url).searchParams.has("listing");

  if (wantsListing) {
    const { filterOptions, listingFilterOptions } =
      await getListingFilterOptions();
    return NextResponse.json({ filterOptions, listingFilterOptions });
  }

  const filterOptions = await getFilterOptions();
  return NextResponse.json({ filterOptions });
}
