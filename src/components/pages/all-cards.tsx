"use client";

import { api } from "@/lib/api";

import { FullCard } from "@/db/schema/card";
import { useCardsFilterState } from "@/hook/use-cards-filter-state";
import { usePaginatedCardsQuery } from "@/hook/use-paginated-cards-query";

import CardsFilter from "../cards-filter";
import { CardsList } from "../cards-list";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filter-options";
import { Header } from "../header";

export type CardsPageData = { cards: FullCard[]; total: number };

type Props = {
  filterOptions: FilterOption[];
  initialCards?: CardsPageData;
};

async function fetchCards(filter: Filter, page: number) {
  const { data } = await api.get<CardsPageData>(`/api/cards`, {
    params: {
      page: page,
      filter: JSON.stringify(filter),
    },
  });
  return data;
}

export function CardsPage({ filterOptions, initialCards }: Props) {
  const { page, filter, handleChangePage, handleFilterChange } =
    useCardsFilterState();
  const query = usePaginatedCardsQuery<CardsPageData>({
    queryKey: ["all-cards"],
    filter,
    page,
    initialData: initialCards,
    fetchFn: fetchCards,
  });

  return (
    <>
      <Header
        title="Все карты"
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
          onPageChange={handleChangePage}
        />
      ) : (
        <CardsListSkeleton />
      )}
    </>
  );
}
