"use client";

import { useEffect, useState } from "react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { CARDS_PER_PAGE } from "@/lib/constants";

import { FullCard } from "@/db/schema/card";

import CardsFilter from "../cards-filter";
import { CardsList } from "../cards-list";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filter-options";
import { Header } from "../header";

const PAGE_SIZE = CARDS_PER_PAGE;
const DEFAULT_FILTER = { sort: "createdAt-desc" } as Filter;

export type CardsPageData = { cards: FullCard[]; total: number };

type Props = {
  title: string;
  filterOptions: FilterOption[];
  initialCards?: CardsPageData;
};

function buildCardsUrl(filter: Filter, page: number) {
  const params = new URLSearchParams({ page: String(page) });
  params.set("filter", JSON.stringify(filter));
  return `${process.env.NEXT_PUBLIC_URL}/api/cards?${params.toString()}`;
}

async function fetchCards(
  filter: Filter,
  page: number
): Promise<CardsPageData> {
  const res = await fetch(buildCardsUrl(filter, page));
  return res.json();
}

export function CardsPage({ title, filterOptions, initialCards }: Props) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>();
  const [page, setPage] = useState(1);

  const isDefaultView = !filter;
  const effectiveFilter = filter ?? DEFAULT_FILTER;

  const query = useQuery({
    queryKey: ["cards", filter, page],
    queryFn: () => fetchCards(effectiveFilter, page),
    placeholderData: keepPreviousData,
    initialData: isDefaultView && page === 1 ? initialCards : undefined,
  });

  const total = query.data?.total ?? 0;
  const hasNextPage = page * PAGE_SIZE < total;

  useEffect(() => {
    if (!hasNextPage) return;
    queryClient.prefetchQuery({
      queryKey: ["cards", filter, page + 1],
      queryFn: () => fetchCards(filter ?? DEFAULT_FILTER, page + 1),
    });
  }, [queryClient, filter, page, hasNextPage]);

  const handleFilterChange = (data: Filter) => {
    setFilter(data);
    setPage(1);
  };

  return (
    <>
      <Header
        title={title}
        element={
          <CardsFilter
            defaultSort="createdAt-desc"
            filterOptions={filterOptions}
            setFilters={handleFilterChange}
          />
        }
      />

      {query.data ? (
        <CardsList
          cards={query.data.cards}
          total={query.data.total}
          page={page}
          onPageChange={setPage}
        />
      ) : (
        <CardsListSkeleton />
      )}
    </>
  );
}
