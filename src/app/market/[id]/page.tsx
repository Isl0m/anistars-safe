import { notFound } from "next/navigation";

import { getMarketListing } from "@/lib/queries";

import { getFilterOptions } from "@/components/get-filter-options";
import MarketViewPage from "@/components/pages/market-view";
import { MarketListingDetail } from "@/components/use-market";

export const revalidate = 30;

export default async function MarketView({
  params,
}: {
  params: { id: string };
}) {
  const numericId = Number(params.id);
  if (Number.isNaN(numericId)) notFound();

  const [listing, filterOptions] = await Promise.all([
    getMarketListing(numericId),
    getFilterOptions(),
  ]);

  if (!listing) notFound();

  return (
    <MarketViewPage
      id={params.id}
      listing={listing as unknown as MarketListingDetail}
      filterOptions={filterOptions}
    />
  );
}
