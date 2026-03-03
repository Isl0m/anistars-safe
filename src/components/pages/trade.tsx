"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { CreateTradeType } from "@/app/api/trade/create/route";
import { FullCard } from "@/db/schema/card";
import { UserExtended } from "@/db/schema/user";

import CardsFilter from "../cards-filter";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filte-options";
import { Header } from "../header";
import CardsPagination from "../pagination";
import { useTelegram } from "../telegram-provider";
import { useCardSelect } from "../use-card-select";

export default function TradePage({ receiver }: { receiver: string }) {
  const { tgUser } = useTelegram();
  const [filter, setFilter] = useState<Filter>();

  const query = useQuery({
    queryKey: ["trade-cards", filter],
    queryFn: async () => {
      if (!tgUser) return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/cards/difference?id=${tgUser.id}&secondId=${receiver}`,
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
        <TradePageContent
          user={query.data.user}
          cards={query.data.cards}
          receiver={receiver}
          filterOptions={query.data.filterOptions}
          setFilters={handleFilterChange}
        />
      </main>
    );
  }
  return (
    <main className="flex min-h-screen flex-col gap-4">
      <Header title={"Трейд"} />
      <CardsListSkeleton />
    </main>
  );
}

type Steps = "select" | "confirm";

function TradePageContent({
  user,
  cards,
  filterOptions,
  receiver,
  setFilters,
}: {
  user: UserExtended;
  cards: FullCard[];
  filterOptions: FilterOption[];
  receiver: string;
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
  const router = useRouter();
  const [step, setStep] = useState<Steps>("select");
  const [isLoading, setIsLoading] = useState(false);
  const maxCardsPerTrade = user.isPremium ? 10 : 5;

  const handleTrade = async () => {
    setIsLoading(true);
    if (selectedCards.length === 0) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, выберите хотя бы одну карту для обмена.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    if (selectedCards.length > maxCardsPerTrade) {
      toast({
        title: "Ошибка",
        description: `Максимальное количество выбираемых карт - ${maxCardsPerTrade}.`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const data: CreateTradeType = {
      senderId: user.id,
      receiverId: receiver,
      cardIds: selectedCards.map((c) => c.id),
    };

    await fetch(`${process.env.NEXT_PUBLIC_URL}/api/trade/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    toast({
      title: "Трейд отправлен",
      description: `Трейд ${selectedCards.length} карт отправлен ${receiver}`,
    });

    // Reset the form
    router.push(`/trade`);
  };

  const headerSection: Record<Steps, JSX.Element> = {
    select: (
      <Header
        title="Трейд"
        element={
          <CardsFilter filterOptions={filterOptions} setFilters={setFilters} />
        }
      />
    ),
    confirm: <Header title="Подтверждение" />,
  };

  const mainSection: Record<Steps, JSX.Element> = {
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
      <SelectedCardsList selectedCards={selectedCards} onClick={onCardSelect} />
    ),
  };

  const footerSection: Record<Steps, JSX.Element> = {
    select: (
      <div className="fixed bottom-0 left-0 flex w-full gap-4 border-t bg-background p-4">
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
          disabled={selectedCards.length === 0}
        >
          Продолжить ({selectedCards.length})
        </Button>
      </div>
    ),
    confirm: (
      <div className="fixed bottom-0 left-0 w-full border-t bg-background p-4">
        <div className="flex gap-4">
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
            disabled={isLoading}
            className="w-full"
          >
            Подтвердить
          </Button>
        </div>
      </div>
    ),
  };

  return (
    <>
      {headerSection[step]}

      <div className="px-2">{mainSection[step]}</div>

      {footerSection[step]}
    </>
  );
}

type CardsSelectListProps = {
  pageCards: FullCard[];
  selectedCards: FullCard[];
  onClick: (card: FullCard) => () => void;
  pagination: {
    page: number;
    cardsLeft: number;
    changePage: (page: number) => void;
  };
};

export function CardsSelectList({
  pageCards,
  selectedCards,
  onClick,
  pagination: { page, cardsLeft, changePage },
}: CardsSelectListProps) {
  return (
    <section className="flex flex-col gap-12">
      {pageCards.length > 0 ? (
        <div className="mb-12 space-y-4">
          <ul className="grid grid-cols-4 gap-2">
            {pageCards.map((card) => (
              <li
                key={card.id}
                className={`relative w-fit cursor-pointer overflow-hidden transition-all duration-100 ease-in-out ${
                  Boolean(selectedCards.find((s) => s.id === card.id))
                    ? "rounded-md ring-2 ring-primary"
                    : "hover:ring-1 hover:ring-primary-foreground"
                }`}
                onClick={onClick(card)}
              >
                <div>
                  <Image
                    src={card.image}
                    width={240}
                    height={320}
                    className="rounded"
                    loading="lazy"
                    alt={card.slug}
                  />
                  {Boolean(selectedCards.find((s) => s.id === card.id)) && (
                    <div className="absolute right-1 top-1 rounded-full bg-primary p-1 transition-opacity duration-100 ease-in-out">
                      <CheckIcon className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <CardsPagination
            page={page}
            cardsLeft={cardsLeft}
            handleChangePage={changePage}
          />
        </div>
      ) : (
        <h1>Нет подходящих карт</h1>
      )}
    </section>
  );
}

type SelectedCardsListProps = {
  selectedCards: FullCard[];
  onClick: (card: FullCard) => () => void;
};

export function SelectedCardsList({
  selectedCards,
  onClick,
}: SelectedCardsListProps) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {selectedCards.map((card) => (
        <li
          key={card.id}
          className={`relative w-fit cursor-pointer overflow-hidden rounded ring-1 ring-primary transition-all duration-100 ease-in-out`}
          onClick={onClick(card)}
        >
          <div>
            <Image src={card.image} width={240} height={320} alt={card.slug} />

            <div className="absolute right-1 top-1 rounded-full bg-primary p-[2px] transition-opacity duration-100 ease-in-out">
              <CheckIcon className="h-2 w-2 text-primary-foreground" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
