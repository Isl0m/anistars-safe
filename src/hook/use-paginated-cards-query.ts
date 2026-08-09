import { useEffect } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { CARDS_PER_PAGE } from "@/lib/constants";

import { Filter } from "@/components/get-filter-options";

export function usePaginatedCardsQuery<T extends { total: number }>({
  queryKey,
  filter,
  page,
  fetchFn,
}: {
  queryKey: unknown[];
  filter: Filter;
  page: number;
  fetchFn: (filter: Filter, page: number) => Promise<T | undefined>;
}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...queryKey, filter, page],
    queryFn: () => fetchFn(filter, page),
    placeholderData: keepPreviousData,
  });

  const total = query.data?.total ?? 0;
  const hasNextPage = page * CARDS_PER_PAGE < total;

  useEffect(() => {
    if (!hasNextPage) return;
    queryClient.prefetchQuery({
      queryKey: [...queryKey, filter, page + 1],
      queryFn: () => fetchFn(filter, page + 1),
    });
  }, [queryClient, JSON.stringify(queryKey), filter, page, hasNextPage]);

  return {
    ...query,
    total,
    hasNextPage,
  };
}
