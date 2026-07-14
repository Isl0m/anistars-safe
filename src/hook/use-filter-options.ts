import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

import {
  FilterOption,
  ListingFilterOption,
} from "@/components/get-filter-options";

export function useFilterOptions(initialData?: {
  filterOptions: FilterOption[];
}) {
  return useQuery({
    queryKey: ["filter-options"],
    queryFn: async () => {
      const { data } = await api.get<{ filterOptions: FilterOption[] }>(
        `/api/cards/filter-options`
      );
      return data;
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
      const { data } = await api.get<{
        filterOptions: FilterOption[];
        listingFilterOptions: ListingFilterOption[];
      }>(`/api/cards/filter-options`, {
        params: { listing: 1 },
      });
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
