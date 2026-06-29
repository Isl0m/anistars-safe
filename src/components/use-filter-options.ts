import { useQuery } from "@tanstack/react-query";

import { FilterOption, ListingFilterOption } from "./get-filter-options";

export function useFilterOptions(initialData?: {
  filterOptions: FilterOption[];
}) {
  return useQuery({
    queryKey: ["filter-options"],
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/cards/filter-options`
      );
      return (await res.json()) as { filterOptions: FilterOption[] };
    },
    staleTime: Infinity,
    gcTime: Infinity,
    initialData,
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
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
