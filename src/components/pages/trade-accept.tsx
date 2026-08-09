"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, Coins, Loader2, UserIcon } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { showApiError } from "@/lib/api-feedback";
import { calcTradeCost } from "@/lib/trade-cost";
import { getImageProxyUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { UpdateTradeType } from "@/app/api/trade/update/route";
import { Card } from "@/db/schema/card";
import { SelectMultiTrade } from "@/db/schema/trade";
import { UserExtended } from "@/db/schema/user";
import { useCardSelect } from "@/hook/use-card-select";
import { useCardsFilterState } from "@/hook/use-cards-filter-state";
import { useDiffFilterOptions } from "@/hook/use-filter-options";
import { Badge } from "@/ui/badge";
import { Skeleton } from "@/ui/skeleton";

import CardsFilter from "../cards-filter";
import { FilterOption } from "../get-filter-options";
import { Header } from "../header";
import { StepIndicator } from "../step-indicator";
import { useTelegram } from "../telegram-provider";
import { UserLink } from "../user-link";
import {
  ReservedCards,
  ReservedTradeWarning,
  SelectedCardsList,
  TradeCardsList,
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
  const { userId } = useTelegram();

  const query = useQuery({
    queryKey: ["trade-user", userId],
    queryFn: async () => {
      if (!userId) return;
      const { data } = await api.get<{
        user: UserExtended;
        reserved: ReservedCards;
      }>(`/api/user/trade`);
      return data;
    },
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });
  const { data: filterData } = useDiffFilterOptions(
    trade.receiverId,
    trade.senderId
  );

  if (query.data && filterData) {
    return (
      <AcceptTradePageContent
        trade={trade}
        filterOptions={filterData.filterOptions}
        reserved={query.data.reserved}
      />
    );
  }
  const suggestedSkeletonCount = Math.min(
    Math.max(trade.senderCards.length, 1),
    8
  );

  return (
    <>
      <Header title="Входящий трейд" />
      <div className="space-y-2 p-2">
        <Skeleton className="h-4 w-56 rounded-full" />
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
          <div className="mb-2 flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
          </div>
          <Skeleton className="h-4 w-64 rounded" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 rounded" />
          <ul className="grid grid-cols-4 gap-2">
            {new Array(suggestedSkeletonCount).fill(0).map((_, idx) => (
              <li key={idx}>
                <Skeleton className="aspect-[3/4] rounded-md" />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex w-full gap-4 border-t bg-card px-4 py-2">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </>
  );
}

export function AcceptTradePageContent({
  filterOptions,
  trade,
  reserved,
}: {
  trade: SelectMultiTrade & {
    senderName: string;
    senderPhotoUrl: string | null;
    senderCards: (Card & { rarity: string })[];
  };
  filterOptions: FilterOption[];
  reserved?: ReservedCards;
}) {
  const reservedLookup = useReservedLookup(reserved);
  const filterState = useCardsFilterState();
  const { selectedCards, resetSelected, onCardSelect } = useCardSelect();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Steps>("show");
  const router = useRouter();
  const requiredCount = trade.senderCards.length;

  const handleTrade = async () => {
    setIsLoading(true);
    if (selectedCards.length !== requiredCount) {
      toast.warning(`Нужно выбрать ровно ${requiredCount} карт.`);
      setIsLoading(false);
      return;
    }

    const data: UpdateTradeType = {
      tradeId: trade.id,
      cardIds: selectedCards.map((c) => c.id),
    };

    try {
      await api.post("/api/trade/update", data);
      toast.success("Трейд успешно принят");
      router.push("/trade");
    } catch (e) {
      showApiError(e, "Не удалось принять трейд");
    } finally {
      setIsLoading(false);
    }
  };

  async function cancelTrade() {
    setIsLoading(true);
    try {
      await api.delete("/api/trade/cancel", {
        data: { id: trade.id },
      });
      toast.warning("Трейд отклонён");
      router.push("/trade");
    } catch (e) {
      showApiError(e, "Не удалось отклонить трейд");
    } finally {
      setIsLoading(false);
    }
  }

  // Preview only — /api/trade/update recomputes this from the same helper and
  // persists its own result.
  const previewCost = calcTradeCost(
    trade.senderCards.map((c) => c.rarityId),
    selectedCards.map((c) => c.rarityId)
  );

  return (
    <>
      <Header
        title="Входящий трейд"
        element={
          step === "select" ? (
            <CardsFilter
              defaultSort={filterState.filter.sort}
              filterOptions={filterOptions}
              setFilters={filterState.handleFilterChange}
            />
          ) : undefined
        }
      />

      <section className="space-y-2 p-2">
        <StepIndicator
          currentStep={stepIndex[step]}
          steps={["Просмотр", "Выбор", "Обмен"]}
          className="px-1"
        />

        {step === "show" && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
            <UserLink
              userId={trade.senderId}
              name={trade.senderName}
              photoUrl={trade.senderPhotoUrl}
              size={40}
              className="mb-2"
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
        )}
        {step === "select" && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Выберите {requiredCount} карт в ответ
            </p>
            <Badge
              variant={
                selectedCards.length === requiredCount ? "default" : "secondary"
              }
              className="text-[10px]"
            >
              {selectedCards.length}/{requiredCount}
            </Badge>
          </div>
        )}
      </section>
      <div className="flex-1 overflow-y-auto p-2">
        <div
          key={step}
          className="duration-300 animate-in fade-in-0 slide-in-from-bottom-2"
        >
          {step === "show" && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Предложенные карты</h3>
              <SuggestedCardsList cards={trade.senderCards} cols={4} />
            </div>
          )}
          {step === "select" && (
            <TradeCardsList
              secondId={trade.senderId}
              selectedCards={selectedCards}
              onCardSelect={onCardSelect}
              reserved={reservedLookup}
              {...filterState}
            />
          )}

          {step === "confirm" && (
            <div className="space-y-3">
              <ReservedTradeWarning
                cards={selectedCards}
                reserved={reservedLookup}
              />
              <div className="rounded-xl border bg-card p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <ArrowRightLeft className="h-4 w-4" />
                    Вы отдаёте ({selectedCards.length})
                  </h4>
                  {previewCost > 0 && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600"
                    >
                      <Coins className="mr-1 h-3 w-3" />
                      {previewCost}
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

              <div className="rounded-xl border bg-card p-3">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-600">
                  <UserIcon className="h-4 w-4" />
                  Вы получите от {trade.senderName} ({requiredCount})
                </h4>
                <SuggestedCardsList cards={trade.senderCards} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full gap-4 border-t bg-card px-4 py-2">
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
    <ul className={`grid gap-2 ${cols === 4 ? "grid-cols-4" : "grid-cols-5"}`}>
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
