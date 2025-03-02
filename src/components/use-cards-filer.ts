import { useState } from "react";

import { isKey } from "@/lib/utils";

import { FullCard } from "@/db/schema/card";

type Props = {
  cardsPerPage: number;
  cards: FullCard[];
};

export function useCardsFilter({ cardsPerPage, cards }: Props) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Map<string, string>>(new Map());
  const [filteredCards, setFilteredCards] = useState<FullCard[]>(cards);

  const cardsLeft = filteredCards.length - page * cardsPerPage;

  const skip = (page - 1) * cardsPerPage;
  const pageCards = filteredCards.slice(skip, skip + cardsPerPage);

  const filterSelect = (key: string, value: string) => {
    if (!value) return;
    setFilter((prev) => prev.set(key, value));

    setFilteredCards(() =>
      cards.filter((card) => {
        if (filter.size <= 0) return true;
        for (let [key, value] of filter) {
          if (isKey(card, key)) {
            if (key === "technique") {
              const technique = card[key];
              if (!technique) return false;
              if (value === "power" && !technique.power) return false;
              if (value === "heal" && !technique.heal) return false;
              if (value === "dodge" && !technique.dodge) return false;
            } else if (String(card[key]) !== value) {
              return false;
            }
          }
        }
        return true;
      })
    );
    setPage(1);
  };

  const filterReset = () => {
    setFilter(new Map());
    setFilteredCards(cards);
    setPage(1);
  };

  const changePage = (page: number) => {
    setPage(page);
  };

  return {
    pageCards,
    pagination: {
      page,
      cardsLeft,
      changePage,
    },
    filterSelect,
    filterReset,
  };
}
