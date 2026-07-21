"use client";

import { api } from "@/lib/api";

import { FullCard } from "@/db/schema/card";
import { User } from "@/db/schema/user";
import { useCardsFilterState } from "@/hook/use-cards-filter-state";
import { usePaginatedCardsQuery } from "@/hook/use-paginated-cards-query";

import CardsFilter from "../cards-filter";
import { CardsList } from "../cards-list";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filter-options";
import { Header } from "../header";
import { useTelegram } from "../telegram-provider";

type MissingProps = {
  filterOptions: FilterOption[];
};

type MissingCardsData = {
  cards: FullCard[];
  user: User;
  total: number;
};

export async function fetchMissingCards(filter: Filter, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    filter: JSON.stringify(filter),
  });
  const { data } = await api.get<MissingCardsData | undefined>(
    `/api/user/missing?${params.toString()}`
  );
  return data;
}

export function Missing({ filterOptions }: MissingProps) {
  const { userId } = useTelegram();
  const { page, filter, handleChangePage, handleFilterChange } =
    useCardsFilterState();

  const query = usePaginatedCardsQuery<MissingCardsData>({
    queryKey: ["profile-missing-cards", userId],
    filter,
    page,
    fetchFn: fetchMissingCards,
  });

  return (
    <>
      <Header
        title={"Отсутствующие карты"}
        element={
          <CardsFilter
            defaultSort={filter.sort}
            filterOptions={filterOptions}
            setFilters={handleFilterChange}
          />
        }
      />
      <section className="flex-1 overflow-y-auto py-4">
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
      </section>
    </>
  );
}
