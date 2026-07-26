import { notFound } from "next/navigation";

import { getAccessFor, getMarketListing } from "@/lib/queries";

import { getFilterOptions } from "@/components/get-filter-options";
import MarketViewPage from "@/components/pages/market-view";
import { MarketListingDetail } from "@/hook/use-market";

export const revalidate = 30;

export default async function MarketView(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const numericId = Number(params.id);
  if (Number.isNaN(numericId)) notFound();

  // See src/app/market/page.tsx — when the section is gated the listing is
  // fetched client-side through the guarded API rather than embedded in the
  // RSC payload.
  const access = await getAccessFor("/market");

  const [listing, filterOptions] = await Promise.all([
    access === "all" ? getMarketListing(numericId) : undefined,
    getFilterOptions(),
  ]);

  if (access === "all" && !listing) notFound();

  return (
    <MarketViewPage
      id={params.id}
      listing={listing as unknown as MarketListingDetail | undefined}
      filterOptions={filterOptions}
    />
  );
}
