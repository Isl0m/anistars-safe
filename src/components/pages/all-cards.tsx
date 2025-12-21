"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { FullCard } from "@/db/schema/card";

import CardsFilter from "../cards-filter";
import { CardsList } from "../cards-list";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filte-options";
import { Header } from "../header";

type Props = {
  title: string;
  filterOptions: FilterOption[];
};

export function CardsPage({ title, filterOptions }: Props) {
  const [filter, setFilter] = useState<Filter>();

  const query = useQuery({
    queryKey: ["cards", filter],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/cards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filter ?? {}),
      });
      return (await response.json()).cards as Promise<FullCard[]>;
    },
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = (data: Filter) => {
    setFilter(data);
  };

  return (
    <>
      <Header
        title={title}
        element={
          <CardsFilter
            filterOptions={filterOptions}
            setFilters={handleFilterChange}
          />
        }
      />

      {query.data ? <CardsList cards={query.data} /> : <CardsListSkeleton />}
    </>
  );
}
