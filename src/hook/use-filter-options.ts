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
    initialData,
  });
}

export function useUserFilterOptions(userId?: string) {
  return useQuery({
    queryKey: ["user-options", userId],
    queryFn: async () => {
      const { data } = await api.get<{ filterOptions: FilterOption[] }>(
        `/api/user/filter-options`,
        {
          params: { id: userId },
        }
      );
      return data;
    },
    enabled: !!userId,
  });
}

export function useDiffFilterOptions(userId?: string, diffId?: string) {
  return useQuery({
    queryKey: ["diff-filter-options", userId, diffId],
    queryFn: async () => {
      const { data } = await api.get<{ filterOptions: FilterOption[] }>(
        `/api/user/filter-options/difference`,
        {
          params: { id: userId, diffId },
        }
      );
      return data;
    },
    enabled: !!userId,
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
  });
}
