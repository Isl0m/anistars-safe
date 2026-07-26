import { getAccessFor, getMarketListings } from "@/lib/queries";

import { getFilterOptions } from "@/components/get-filter-options";
import MarketPage from "@/components/pages/market";
import { MarketListingSummary } from "@/hook/use-market";

export const revalidate = 10;

export default async function Market() {
  // This runs before RouteGuard renders and its output ships to whoever asked
  // for the page, so gated data must not be embedded here. The client fetches
  // it from /api/market/listings instead, which checks the caller's initData
  // against the same access map.
  const access = await getAccessFor("/market");

  const [listings, initialFilterOptions] = await Promise.all([
    access === "all" ? getMarketListings() : undefined,
    getFilterOptions(),
  ]);

  return (
    <MarketPage
      initialListings={
        listings as unknown as MarketListingSummary[] | undefined
      }
      filterOptions={initialFilterOptions}
    />
  );
}
