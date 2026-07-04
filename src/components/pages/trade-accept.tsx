"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, Coins, Loader2, UserIcon } from "lucide-react";

import { getImageProxyUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { UpdateTradeType } from "@/app/api/trade/update/route";
import { Card, FullCard } from "@/db/schema/card";
import { SelectMultiTrade } from "@/db/schema/trade";
import { UserExtended } from "@/db/schema/user";
import { Badge } from "@/ui/badge";
import { Skeleton } from "@/ui/skeleton";

import CardsFilter from "../cards-filter";
import { Filter, FilterOption } from "../get-filter-options";
import { Header } from "../header";
import { StepIndicator } from "../step-indicator";
import { useTelegram } from "../telegram-provider";
import { useApi } from "../use-api";
import { useCardSelect } from "../use-card-select";
import { useTelegramBackButton } from "../use-telegram-back-button";
import { UserLink } from "../user-link";
import {
  CardsSelectList,
  ReservedCards,
  ReservedTradeWarning,
  SelectedCardsList,
  useReservedLookup,
} from "./trade";

type Steps = "show" | "select" | "confirm";

const stepIndex: Record<Steps, number> = { show: 1, select: 2, confirm: 3 };

export default function AcceptTradePage({
  trade,
}: {
  trade: SelectMultiTrade & {
    senderName: string;
    senderPhotoUrl: string | null;
    senderCards: (Card & { rarity: string })[];
  };
}) {
  const { tgUser } = useTelegram();
  useTelegramBackButton("/trade");
  const [filter, setFilter] = useState<Filter>();

  const query = useQuery({
    queryKey: ["trade-accept-cards", tgUser?.id, trade.senderId, filter],
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
        reserved: ReservedCards;
      }>;
    },
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = (data: Filter) => {
    setFilter(data);
  };

  if (query.data) {
    return (
      <main className="flex h-full flex-col gap-4 md:container">
        <AcceptTradePageContent
          trade={trade}
          cards={query.data.cards}
          filterOptions={query.data.filterOptions}
          reserved={query.data.reserved}
          setFilters={handleFilterChange}
        />
      </main>
    );
  }
  const suggestedSkeletonCount = Math.min(
    Math.max(trade.senderCards.length, 1),
    8
  );

  return (
    <main className="flex h-full flex-col gap-4 md:container">
      <Header title="Входящий трейд" />
      <div className="px-3 pb-1">
        <Skeleton className="h-6 w-56 rounded-full" />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-2 pb-20 pt-2">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
          <Skeleton className="h-3 w-48 rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40 rounded" />
          <ul className="grid grid-cols-4 gap-2">
            {new Array(suggestedSkeletonCount).fill(0).map((_, idx) => (
              <li key={idx}>
                <Skeleton className="aspect-[3/4] rounded-md" />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 flex w-full gap-3 border-t bg-card p-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </main>
  );
}

export function AcceptTradePageContent({
  cards,
  filterOptions,
  trade,
  reserved,
  setFilters,
}: {
  trade: SelectMultiTrade & {
    senderName: string;
    senderPhotoUrl: string | null;
    senderCards: (Card & { rarity: string })[];
  };
  cards: FullCard[];
  filterOptions: FilterOption[];
  reserved?: ReservedCards;
  setFilters: (filters: Filter) => void;
}) {
  const reservedLookup = useReservedLookup(reserved);
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
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Steps>("show");
  const router = useRouter();
  const api = useApi();
  const requiredCount = trade.senderCards.length;

  const handleTrade = async () => {
    setIsLoading(true);
    if (selectedCards.length !== requiredCount) {
      toast({
        title: "Ошибка",
        description: `Нужно выбрать ровно ${requiredCount} карт.`,
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

    try {
      await api("/api/trade/update", { method: "POST", body: data });
      toast({
        title: "Трейд успешно принят",
        variant: "default",
      });
      router.push("/trade");
    } catch (e) {
      toast({
        title: "Ошибка",
        description:
          e instanceof Error ? e.message : "Не удалось принять трейд",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  async function cancelTrade() {
    setIsLoading(true);
    try {
      await api("/api/trade/cancel", {
        method: "DELETE",
        body: { id: trade.id },
      });
      toast({
        title: "Трейд отклонён",
        variant: "default",
      });
      router.push("/trade");
    } catch (e) {
      toast({
        title: "Ошибка",
        description:
          e instanceof Error ? e.message : "Не удалось отклонить трейд",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function calcDifference() {
    const raritiesDiff: Record<string, number> = {};
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
    return (
      Object.values(raritiesDiff)
        .map(Number)
        .reduce((prev, curr) => prev + curr, 0) * 100
    );
  }

  return (
    <>
      <Header
        title="Входящий трейд"
        element={
          step === "select" ? (
            <CardsFilter
              filterOptions={filterOptions}
              setFilters={setFilters}
            />
          ) : undefined
        }
      />

      <div className="px-3 pb-1">
        <StepIndicator
          currentStep={stepIndex[step]}
          steps={["Просмотр", "Выбор", "Обмен"]}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-20 pt-2">
        <div
          key={step}
          className="duration-300 animate-in fade-in-0 slide-in-from-bottom-2"
        >
        {step === "show" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <UserLink
                userId={trade.senderId}
                name={trade.senderName}
                photoUrl={trade.senderPhotoUrl}
                size={40}
                className="mb-3 gap-3"
              >
                <div>
                  <p className="text-sm font-semibold">{trade.senderName}</p>
                  <p className="text-xs text-muted-foreground">
                    предлагает обмен
                  </p>
                </div>
              </UserLink>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>{requiredCount} карт — выберите столько же в ответ</span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Предложенные карты</h3>
              <SuggestedCardsList cards={trade.senderCards} cols={4} />
            </div>
          </div>
        )}

        {step === "select" && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Выберите {requiredCount} карт в ответ
              </p>
              <Badge
                variant={
                  selectedCards.length === requiredCount
                    ? "default"
                    : "secondary"
                }
                className="text-[10px]"
              >
                {selectedCards.length}/{requiredCount}
              </Badge>
            </div>
            <CardsSelectList
              pageCards={pageCards}
              selectedCards={selectedCards}
              onClick={onCardSelect}
              reserved={reservedLookup}
              pagination={{
                cardsLeft,
                changePage: setPage,
                page,
              }}
            />
          </>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <ReservedTradeWarning
              cards={selectedCards}
              reserved={reservedLookup}
            />
            <div className="rounded-xl border bg-card p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Вы отдаёте ({selectedCards.length})
                </h4>
                {calcDifference() > 0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600"
                  >
                    <Coins className="mr-1 h-3 w-3" />
                    {calcDifference()}
                  </Badge>
                )}
              </div>
              <SelectedCardsList
                selectedCards={selectedCards}
                onClick={onCardSelect}
                reserved={reservedLookup}
                cols={5}
              />
            </div>

            <div className="flex justify-center">
              <div className="rounded-full bg-muted p-2">
                <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <div className="rounded-xl border bg-card p-3.5">
              <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-green-600">
                <UserIcon className="h-3.5 w-3.5" />
                Вы получите от {trade.senderName} ({requiredCount})
              </h4>
              <SuggestedCardsList cards={trade.senderCards} />
            </div>
          </div>
        )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 flex w-full gap-3 border-t bg-card p-4">
        {step === "show" && (
          <>
            <Button
              onClick={cancelTrade}
              className="w-full"
              variant="destructive"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Отклонить
            </Button>
            <Button onClick={() => setStep("select")} className="w-full">
              Выбрать карты
            </Button>
          </>
        )}
        {step === "select" && (
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
              disabled={selectedCards.length !== requiredCount}
            >
              Далее ({selectedCards.length}/{requiredCount})
            </Button>
          </>
        )}
        {step === "confirm" && (
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
              disabled={selectedCards.length !== requiredCount || isLoading}
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

type SuggestedCardsListProps = {
  cards: Card[];
  cols?: 4 | 5;
};

export function SuggestedCardsList({
  cards,
  cols = 5,
}: SuggestedCardsListProps) {
  return (
    <ul
      className={`grid gap-2 ${cols === 4 ? "grid-cols-4" : "grid-cols-5"}`}
    >
      {cards.map((card) => (
        <li
          key={card.id}
          className="overflow-hidden rounded-md border shadow-sm"
        >
          <Image
            src={getImageProxyUrl(card.image)}
            width={240}
            height={320}
            className="rounded-md"
            alt={card.slug}
          />
        </li>
      ))}
    </ul>
  );
}
