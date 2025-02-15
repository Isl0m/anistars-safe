"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { UpdateTradeType } from "@/app/api/trade/update/route";
import { FullCard } from "@/db/schema/card";
import { SelectMultiTrade } from "@/db/schema/trade";
import { User } from "@/db/schema/user";
import { Badge } from "@/ui/badge";

import CardsFilter from "../cards-filter";
import { FilterOption } from "../get-filte-options";
import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { useCardSelect } from "../use-card-select";
import { useCardsFilter } from "../use-cards-filer";
import { CardsSelectList, SelectedCardsList } from "./trade";

type Steps = "show" | "select" | "confirm";

export default function AcceptTradePage({
  trade,
}: {
  trade: SelectMultiTrade & { senderName: string; senderCards: FullCard[] };
}) {
  const { tgUser } = useTelegram();

  const [isValidUser, setIsValidUser] = useState(true);
  const [user, setUser] = useState<User>();
  const [cards, setCards] = useState<FullCard[]>();
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>();

  useEffect(() => {
    if (tgUser) {
      if (String(tgUser.id) === trade.receiverId) {
        fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/user/cards/difference?id=${tgUser.id}&secondId=${trade.senderId}`
        )
          .then((res) => res.json())
          .then((data) => {
            setUser(data.user);
            setCards(data.cards);
            setFilterOptions(data.filterOptions);
          });
      } else {
        setIsValidUser(false);
      }
    }
  }, [tgUser]);

  if (!isValidUser) {
    return (
      <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
        <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
          Этот трейд не преднозначен вам
        </h1>
      </main>
    );
  }
  if (!user || !filterOptions || !cards) {
    return (
      <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
        <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
          Загрузка...
        </h1>
      </main>
    );
  }
  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <AcceptTradePageContent
        trade={trade}
        cards={cards}
        filterOptions={filterOptions}
      />
    </main>
  );
}

export function AcceptTradePageContent({
  cards,
  filterOptions,
  trade,
}: {
  trade: SelectMultiTrade & { senderName: string; senderCards: FullCard[] };
  cards: FullCard[];
  filterOptions: FilterOption[];
}) {
  const { pageCards, pagination, filterReset, filterSelect } = useCardsFilter({
    cards,
    cardsPerPage: 16,
  });

  const { selectedCards, resetSelected, onCardSelect } = useCardSelect();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Steps>("show");

  const handleTrade = async () => {
    setIsLoading(true);
    if (selectedCards.length !== trade.senderCards.length) {
      toast({
        title: "Error",
        description: "Count of cands is invalid.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const data: UpdateTradeType = {
      tradeId: trade.id,
      cardIds: selectedCards.map((c) => c.id),
      cost: calcDifference(),
    };

    const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/trade/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    setIsLoading(false);
    resetSelectedCards();
  };

  const resetSelectedCards = () => {
    resetSelected();
    setStep("show");
  };

  function calcDifference() {
    const raritiesDiff: Record<string, number> = {};
    const selectedRarities: Record<string, number> = {};
    let cost = 0;
    trade.senderCards.forEach((c) => {
      if (raritiesDiff[c.rarity]) {
        raritiesDiff[c.rarity] += 1;
      } else {
        raritiesDiff[c.rarity] = 1;
      }
    });
    selectedCards.forEach((c) => {
      if (raritiesDiff[c.rarity]) {
        raritiesDiff[c.rarity] -= 1;
      }
    });
    cost =
      Object.values(raritiesDiff)
        .map(Number)
        .reduce((prev, curr) => prev + curr, 0) * 100;

    return cost;
  }

  const headerSection: Record<Steps, JSX.Element> = {
    show: <Header title="Трейд" />,
    select: (
      <Header
        title="Выберите"
        element={
          <CardsFilter
            filterOptions={filterOptions}
            onFilterSelect={filterSelect}
            onFiltersReset={filterReset}
          />
        }
      />
    ),
    confirm: <Header title="Подтверждение" />,
  };

  const mainSection: Record<Steps, JSX.Element> = {
    show: (
      <div className="space-y-4">
        <h3 className="text-xl">
          <Badge>{trade.senderName}</Badge> предлагает вам трейд
        </h3>
        <SuggestedCardsList cards={trade.senderCards} />
      </div>
    ),
    select: (
      <CardsSelectList
        pageCards={pageCards}
        selectedCards={selectedCards}
        onClick={onCardSelect}
        pagination={pagination}
      />
    ),
    confirm: (
      <>
        <div className="flex items-center justify-between">
          <h3 className="text-lg">Вы отдаете</h3>
          <Badge>Стоимость: {calcDifference()}🪙</Badge>
        </div>
        <SelectedCardsList
          selectedCards={selectedCards}
          onClick={onCardSelect}
        />
        <h3 className="text-lg">Вы получите</h3>
        <SuggestedCardsList cards={trade.senderCards} />
      </>
    ),
  };

  const footerActions: Record<Steps, JSX.Element> = {
    show: (
      <div className="fixed bottom-0 left-0 flex w-full gap-4 border-t bg-background p-4">
        <Button onClick={() => {}} className="w-full" variant={"destructive"}>
          Отказаться
        </Button>
        <Button onClick={() => setStep("select")} className="w-full">
          Выбрать карты взамен
        </Button>
      </div>
    ),
    select: (
      <div className="fixed bottom-0 left-0 flex w-full gap-4 border-t bg-background p-2">
        <Button
          onClick={resetSelected}
          className="w-full"
          size={"sm"}
          variant={"destructive"}
        >
          Сбросить
        </Button>
        <Button
          onClick={() => setStep("confirm")}
          className="w-full"
          size={"sm"}
          disabled={selectedCards.length !== trade.senderCards.length}
        >
          Продолжить ({selectedCards.length})
        </Button>
      </div>
    ),
    confirm: (
      <div className="fixed bottom-0 left-0 flex w-full gap-4 border-t bg-background p-2">
        <Button
          onClick={() => setStep("select")}
          size={"sm"}
          className="w-full"
          variant={"secondary"}
        >
          Назад
        </Button>
        <Button
          onClick={handleTrade}
          size={"sm"}
          className="w-full"
          disabled={
            selectedCards.length !== trade.senderCards.length || isLoading
          }
        >
          Подтвердить
        </Button>
      </div>
    ),
  };
  return (
    <>
      {headerSection[step]}
      {mainSection[step]}
      {footerActions[step]}
    </>
  );
}

type SuggestedCardsListProps = {
  cards: FullCard[];
};

export function SuggestedCardsList({ cards }: SuggestedCardsListProps) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {cards.map((card) => (
        <li key={card.id}>
          <Image
            src={card.image}
            width={255}
            height={320}
            className="rounded"
            alt={card.slug}
          />
        </li>
      ))}
    </ul>
  );
}
