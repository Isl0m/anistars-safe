"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  CheckCircle2,
  Coins,
  Loader2,
  Package,
  UserIcon,
} from "lucide-react";

import { getImageProxyUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { UpdateTradeType } from "@/app/api/trade/update/route";
import { Card, FullCard } from "@/db/schema/card";
import { SelectMultiTrade } from "@/db/schema/trade";
import { UserExtended } from "@/db/schema/user";
import { Badge } from "@/ui/badge";

import CardsFilter from "../cards-filter";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filter-options";
import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { UserLink } from "../user-link";
import { useCardSelect } from "../use-card-select";
import { CardsSelectList, SelectedCardsList } from "./trade";

type Steps = "show" | "select" | "confirm";

function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: string[];
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={`h-px w-4 ${isCompleted ? "bg-primary" : "bg-border"}`}
              />
            )}
            <div className="flex items-center gap-1">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`text-[10px] ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const stepIndex: Record<Steps, number> = { show: 1, select: 2, confirm: 3 };

export default function AcceptTradePage({
  trade,
}: {
  trade: SelectMultiTrade & {
    senderName: string;
    senderCards: (Card & { rarity: string })[];
  };
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
    <main className="flex min-h-screen flex-col gap-4">
      <Header title="Трейд" />
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
  trade: SelectMultiTrade & {
    senderName: string;
    senderCards: (Card & { rarity: string })[];
  };
  cards: FullCard[];
  filterOptions: FilterOption[];
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
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Steps>("show");
  const router = useRouter();
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

    await fetch(`${process.env.NEXT_PUBLIC_URL}/api/trade/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    toast({
      title: "Трейд успешно принят",
      variant: "default",
    });

    router.push("/trade");
  };

  async function cancelTrade() {
    setIsLoading(true);
    await fetch(`${process.env.NEXT_PUBLIC_URL}/api/trade/cancel`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: trade.id }),
    });

    toast({
      title: "Трейд отклонён",
      variant: "default",
    });

    router.push("/trade");
    setIsLoading(false);
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
            <CardsFilter filterOptions={filterOptions} setFilters={setFilters} />
          ) : undefined
        }
      />

      <div className="px-3 pb-1">
        <StepIndicator
          currentStep={stepIndex[step]}
          steps={["Просмотр", "Выбор", "Обмен"]}
        />
      </div>

      <div className="px-2 pb-20">
        {step === "show" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <UserLink
                userId={trade.senderId}
                name={trade.senderName}
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
                <span>
                  {requiredCount} карт — выберите столько же в ответ
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Предложенные карты</h3>
              <SuggestedCardsList cards={trade.senderCards} />
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
            <div className="rounded-xl border bg-card p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-destructive/80">
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
              disabled={
                selectedCards.length !== requiredCount || isLoading
              }
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
};

export function SuggestedCardsList({ cards }: SuggestedCardsListProps) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {cards.map((card) => (
        <li
          key={card.id}
          className="overflow-hidden rounded-lg border shadow-sm"
        >
          <Image
            src={getImageProxyUrl(card.image)}
            width={240}
            height={320}
            className="rounded-lg"
            alt={card.slug}
          />
        </li>
      ))}
    </ul>
  );
}
