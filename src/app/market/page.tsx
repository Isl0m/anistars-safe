import { getCachedMarketListings } from "@/lib/queries";

import { getFilterOptions } from "@/components/get-filter-options";
import MarketPage from "@/components/pages/market";
import { MarketListingSummary } from "@/components/use-market";

export const revalidate = 30;

export default async function Market() {
  const [listings, initialFilterOptions] = await Promise.all([
    getCachedMarketListings(),
    getFilterOptions(),
  ]);

  return (
    <MarketPage
      initialListings={listings as unknown as MarketListingSummary[]}
      initialFilterOptions={initialFilterOptions}
    />
  );
}
