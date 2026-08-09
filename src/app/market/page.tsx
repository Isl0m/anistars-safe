import { getMarketListings } from "@/lib/queries";

import { getFilterOptions } from "@/components/get-filter-options";
import MarketPage from "@/components/pages/market";
import { MarketListingSummary } from "@/hook/use-market";

export const revalidate = 10;

export default async function Market() {
  const [listings, initialFilterOptions] = await Promise.all([
    getMarketListings(),
    getFilterOptions(),
  ]);

  return (
    <MarketPage
      initialListings={listings as unknown as MarketListingSummary[]}
      generatedAt={Date.now()}
      filterOptions={initialFilterOptions}
    />
  );
}
