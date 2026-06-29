"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CheckIcon, Loader2, Package } from "lucide-react";

import { getImageProxyUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { CreateTradeType } from "@/app/api/trade/create/route";
import { FullCard } from "@/db/schema/card";
import { UserExtended } from "@/db/schema/user";
import { Badge } from "@/ui/badge";

import CardsFilter from "../cards-filter";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filter-options";
import { Header } from "../header";
import CardsPagination from "../pagination";
import { StepIndicator } from "../step-indicator";
import { useTelegram } from "../telegram-provider";
import { useApi } from "../use-api";
import { useCardSelect } from "../use-card-select";
import { useTelegramBackButton } from "../use-telegram-back-button";

export default function TradePage({ receiver }: { receiver: string }) {
  const { tgUser } = useTelegram();
  useTelegramBackButton("/trade");
  const [filter, setFilter] = useState<Filter>();

  const query = useQuery({
    queryKey: ["trade-cards", tgUser?.id, receiver, filter],
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
      <Header title="Трейд" />
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
  const cardsPerPage = 16;
  const [page, setPage] = useState(1);

  const maxPage = Math.ceil(cards.length / cardsPerPage);
  useEffect(() => {
    if (page !== 1 && maxPage < page) {
      setPage(1);
    }
  }, [page, maxPage]);

  const cardsLeft = cards.length - page * cardsPerPage;
  const skip = (page - 1) * cardsPerPage;
  const pageCards = cards.slice(skip, skip + cardsPerPage);

  const { selectedCards, resetSelected, onCardSelect } = useCardSelect();
  const router = useRouter();
  const api = useApi();
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
      receiverId: receiver,
      cardIds: selectedCards.map((c) => c.id),
    };

    try {
      await api("/api/trade/create", { method: "POST", body: data });
      toast({
        title: "Трейд отправлен",
        description: `Трейд ${selectedCards.length} карт отправлен`,
      });
      router.push(`/trade`);
    } catch (e) {
      toast({
        title: "Ошибка",
        description:
          e instanceof Error ? e.message : "Не удалось отправить трейд",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header
        title="Трейд"
        element={
          step === "select" ? (
            <CardsFilter
              filterOptions={filterOptions}
              setFilters={setFilters}
            />
          ) : undefined
        }
      />

      <div className="flex items-center justify-between px-3 pb-1">
        <StepIndicator
          currentStep={step === "select" ? 1 : 2}
          steps={["Выбор карт", "Подтверждение"]}
        />
        <Badge variant="secondary" className="text-[10px]">
          {selectedCards.length}/{maxCardsPerTrade}
        </Badge>
      </div>

      <div className="px-2 pb-20">
        {step === "select" ? (
          <CardsSelectList
            pageCards={pageCards}
            selectedCards={selectedCards}
            onClick={onCardSelect}
            pagination={{
              cardsLeft,
              changePage: setPage,
              page,
            }}
          />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Выбранные карты</h3>
              <Badge variant="secondary" className="text-[10px]">
                <Package className="mr-1 h-3 w-3" />
                {selectedCards.length} карт
              </Badge>
            </div>
            <SelectedCardsList
              selectedCards={selectedCards}
              onClick={onCardSelect}
            />
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 flex w-full gap-3 border-t bg-card p-4">
        {step === "select" ? (
          <>
            <Button
              onClick={resetSelected}
              className="w-full"
              variant="outline"
              disabled={selectedCards.length === 0}
            >
              Сбросить
            </Button>
            <Button
              onClick={() => setStep("confirm")}
              className="w-full"
              disabled={selectedCards.length === 0}
            >
              Далее ({selectedCards.length})
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setStep("select")}
              className="w-full"
              variant="outline"
            >
              Назад
            </Button>
            <Button
              onClick={handleTrade}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Загрузка...
                </>
              ) : (
                "Подтвердить"
              )}
            </Button>
          </>
        )}
      </div>
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
    <section className="flex flex-col gap-4">
      {pageCards.length > 0 ? (
        <div className="mb-12 space-y-4">
          <ul className="grid grid-cols-4 gap-2">
            {pageCards.map((card) => {
              const isSelected = selectedCards.some((s) => s.id === card.id);
              return (
                <li
                  key={card.id}
                  className={`relative cursor-pointer overflow-hidden rounded-md transition-all duration-100 ease-in-out ${
                    isSelected
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      : "hover:ring-1 hover:ring-primary/50"
                  }`}
                  onClick={onClick(card)}
                >
                  <Image
                    src={getImageProxyUrl(card.image)}
                    width={240}
                    height={320}
                    className="rounded-md"
                    loading="lazy"
                    alt={card.slug}
                  />
                  {isSelected && (
                    <div className="absolute right-1 top-1 rounded-full bg-primary p-1">
                      <CheckIcon className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <CardsPagination
            page={page}
            cardsLeft={cardsLeft}
            handleChangePage={changePage}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="rounded-full bg-muted p-4">
            <Package className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">Нет подходящих карт</p>
        </div>
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
          className="relative cursor-pointer overflow-hidden rounded-md ring-2 ring-primary ring-offset-1 ring-offset-background transition-all duration-100 ease-in-out"
          onClick={onClick(card)}
        >
          <Image
            src={getImageProxyUrl(card.image)}
            width={240}
            height={320}
            className="rounded-md"
            alt={card.slug}
          />
          <div className="absolute right-0.5 top-0.5 rounded-full bg-primary p-[3px]">
            <CheckIcon className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        </li>
      ))}
    </ul>
  );
}
