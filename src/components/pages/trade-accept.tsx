"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { UpdateTradeType } from "@/app/api/trade/update/route";
import { FullCard } from "@/db/schema/card";
import { SelectMultiTrade } from "@/db/schema/trade";
import { UserExtended } from "@/db/schema/user";
import { Badge } from "@/ui/badge";

import CardsFilter from "../cards-filter";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filte-options";
import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { useCardSelect } from "../use-card-select";
import { CardsSelectList, SelectedCardsList } from "./trade";

type Steps = "show" | "select" | "confirm";

export default function AcceptTradePage({
  trade,
}: {
  trade: SelectMultiTrade & { senderName: string; senderCards: FullCard[] };
}) {
  const { tgUser } = useTelegram();
  const [filter, setFilter] = useState<Filter>();

  const query = useQuery({
    queryKey: ["trade-accept-cards", filter],
    queryFn: async () => {
      if (!tgUser) return;
      if (String(tgUser.id) !== trade.receiverId) return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/cards/difference?id=${tgUser.id}&secondId=${trade.senderId}`,
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
        user: UserExtended;
        filterOptions: FilterOption[];
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
        <AcceptTradePageContent
          trade={trade}
          cards={query.data.cards}
          filterOptions={query.data.filterOptions}
          setFilters={handleFilterChange}
        />
      </main>
    );
  }
  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <Header title={"Трейд"} />
      <CardsListSkeleton />
    </main>
  );
}

export function AcceptTradePageContent({
  cards,
  filterOptions,
  trade,
  setFilters,
}: {
  trade: SelectMultiTrade & { senderName: string; senderCards: FullCard[] };
  cards: FullCard[];
  filterOptions: FilterOption[];
  setFilters: (filters: Filter) => void;
}) {
  let cardsPerPage = 16;
  const [page, setPage] = useState(1);

  if (page != 1 && Math.ceil(cards.length / cardsPerPage) < page) {
    setPage(1);
  }
  const cardsLeft = cards.length - page * cardsPerPage;
  const skip = (page - 1) * cardsPerPage;
  const pageCards = cards.slice(skip, skip + cardsPerPage);

  const handleChangePage = (page: number) => {
    setPage(page);
  };

  const { selectedCards, resetSelected, onCardSelect } = useCardSelect();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Steps>("show");
  const router = useRouter();

  const handleTrade = async () => {
    setIsLoading(true);
    if (selectedCards.length !== trade.senderCards.length) {
      toast({
        title: "Ошибка",
        description: "Количество карт неверно.",
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

    toast({
      title: "Трейд успешно отправлен",
      variant: "default",
    });

    router.push("/trade");
  };

  async function cancelTrade() {
    await fetch(`${process.env.NEXT_PUBLIC_URL}/api/trade/cancel`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: trade.id }),
    });

    toast({
      title: "Трейд успешно отменен",
      variant: "default",
    });

    router.push("/trade");
    setIsLoading(false);
  }

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
          <CardsFilter filterOptions={filterOptions} setFilters={setFilters} />
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
        pagination={{
          cardsLeft,
          changePage: handleChangePage,
          page,
        }}
      />
    ),
    confirm: (
      <div className="space-y-2">
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
      </div>
    ),
  };

  const footerActions: Record<Steps, JSX.Element> = {
    show: (
      <div className="fixed bottom-0 left-0 flex w-full gap-4 border-t bg-background p-4">
        <Button
          onClick={cancelTrade}
          className="w-full"
          variant={"destructive"}
        >
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
      <div className="px-2">{mainSection[step]}</div>
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
            width={240}
            height={320}
            className="rounded"
            alt={card.slug}
          />
        </li>
      ))}
    </ul>
  );
}
