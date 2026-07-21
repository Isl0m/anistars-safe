import { NextResponse } from "next/server";

import { getRequiredParam } from "@/lib/api-utils";

import { getUserFilterOptions } from "@/components/get-filter-options";

export async function GET(request: Request) {
  const param = getRequiredParam(request, "id");
  if ("error" in param) return param.error;

  // const wantsListing = new URL(request.url).searchParams.has("listing");

  // if (wantsListing) {
  //   const { filterOptions, listingFilterOptions } =
  //     await getListingFilterOptions();
  //   return NextResponse.json({ filterOptions, listingFilterOptions });
  // }

  const filterOptions = await getUserFilterOptions(param.value);
  return NextResponse.json({ filterOptions });
}
