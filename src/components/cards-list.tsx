"use client";

import { useState } from "react";
import Image from "next/image";

import { isKey } from "@/lib/utils";

import { FilterOption } from "@/app/page";
import { Card } from "@/db/schema/card";

import CardsFilter from "./cards-filter";
import CardsPagination from "./pagination";

type Props = {
  cards: Card[];
  filterOptions: FilterOption[];
};

export function CardsList({ cards, filterOptions }: Props) {
  let cardsPerPage = 12;
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Map<string, string>>(new Map());
  const [filteredCards, setFilteredCards] = useState<Card[]>(cards);

  const cardsLeft = filteredCards.length - page * cardsPerPage;

  const skip = (page - 1) * cardsPerPage;
  const pageCards = filteredCards.slice(skip, skip + cardsPerPage);

  const handleFilterSelect = (key: string, value: string) => {
    if (!value) return;
    setFilter((prev) => prev.set(key, value));

    setFilteredCards(() =>
      cards.filter((card) => {
        if (filter.size <= 0) return true;
        for (let [key, value] of filter) {
          if (isKey(card, key)) {
            if (card[key] !== Number(value)) {
              return false;
            }
          }
        }
        return true;
      })
    );
    setPage(1);
  };
  const handleFilterReset = () => {
    setFilter(new Map());
    setFilteredCards(cards);
    setPage(1);
  };

  const handleChangePage = (page: number) => {
    setPage(page);
  };

  return (
    <section className="flex flex-col gap-12 md:flex-row">
      <CardsFilter
        filterOptions={filterOptions}
        onFilterSelect={handleFilterSelect}
        onFiltersReset={handleFilterReset}
      />

      {pageCards.length > 0 ? (
        <div className="space-y-8">
          <ul className="grid grid-cols-3 gap-2 md:grid-cols-3 md:gap-8 lg:grid-cols-4">
            {pageCards.map((card) => (
              <li key={card.id}>
                <Image
                  src={card.image}
                  width={255}
                  height={320}
                  alt={card.slug}
                />
              </li>
            ))}
          </ul>
          <CardsPagination
            page={page}
            cardsLeft={cardsLeft}
            handleChangePage={handleChangePage}
          />
        </div>
      ) : (
        <h1>Нет подходящих карт</h1>
      )}
    </section>
  );
}
