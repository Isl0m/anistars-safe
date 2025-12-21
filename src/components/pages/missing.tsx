"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { FullCard } from "@/db/schema/card";
import { User } from "@/db/schema/user";

import CardsFilter from "../cards-filter";
import { CardsList } from "../cards-list";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filte-options";
import { Header } from "../header";
import { useTelegram } from "../telegram-provider";

type MissingProps = {
  filterOptions: FilterOption[];
};

export function Missing({ filterOptions }: MissingProps) {
  const { tgUser } = useTelegram();
  const [filter, setFilter] = useState<Filter>();

  const query = useQuery({
    queryKey: ["profile-missing-cards", filter],
    queryFn: async () => {
      if (!tgUser) return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/missing?id=${tgUser.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(filter ?? {}),
        }
      );
      return (await response.json()) as Promise<{
        cards: FullCard[];
        user: User;
      }>;
    },
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = (data: Filter) => {
    setFilter(data);
  };

  if (query.data) {
    return (
      <main className="flex min-h-screen flex-col gap-4 md:container">
        <Header
          title={"Отсуствующие карты"}
          element={
            <CardsFilter
              filterOptions={filterOptions}
              setFilters={handleFilterChange}
            />
          }
        />
        <CardsList cards={query.data.cards} />
      </main>
    );
  }
  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <Header title={"Отсуствующие карты"} />
      <CardsListSkeleton />
    </main>
  );
}
