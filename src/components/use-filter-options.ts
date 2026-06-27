import { useQuery } from "@tanstack/react-query";

import { FilterOption, ListingFilterOption } from "./get-filter-options";

// Filter options are static for a session (server-cached for an hour), so we
// keep them around long enough to be fetched once and reused across pages.
const STALE_TIME = 60 * 60 * 1000;

export function useFilterOptions() {
  return useQuery({
    queryKey: ["filter-options"],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/cards/filter-options`
      );
      return (await res.json()) as { filterOptions: FilterOption[] };
    },
    staleTime: STALE_TIME,
    gcTime: STALE_TIME,
  });
}

export function useListingFilterOptions() {
  return useQuery({
    queryKey: ["filter-options", "listing"],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/cards/filter-options?listing=1`
      );
      return (await res.json()) as {
        filterOptions: FilterOption[];
        listingFilterOptions: ListingFilterOption[];
      };
    },
    staleTime: STALE_TIME,
    gcTime: STALE_TIME,
  });
}
