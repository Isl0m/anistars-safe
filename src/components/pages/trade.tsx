"use client";

import React, { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckIcon, Gavel, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { showApiError } from "@/lib/api-feedback";
import { MAX_CARDS_PER_TRADE } from "@/lib/constants";
import { getImageProxyUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { CreateTradeType } from "@/app/api/trade/create/route";
import { FullCard } from "@/db/schema/card";
import { UserExtended } from "@/db/schema/user";
import { useCardSelect } from "@/hook/use-card-select";
import { useCardsFilterState } from "@/hook/use-cards-filter-state";
import { useDiffFilterOptions } from "@/hook/use-filter-options";
import { usePaginatedCardsQuery } from "@/hook/use-paginated-cards-query";
import { useTelegramBackButton } from "@/hook/use-telegram-back-button";
import { Badge } from "@/ui/badge";
import { Skeleton } from "@/ui/skeleton";

import CardsFilter from "../cards-filter";
import { CardsSelectListServer } from "../cards-list";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filter-options";
import { Header } from "../header";
import { StepIndicator } from "../step-indicator";
import { useTelegram } from "../telegram-provider";

export type ReservedCards = { listed: string[]; offered: string[] };

export type ReservedLookup = {
  listed: Set<string>;
  offered: Set<string>;
  has: (id: string) => boolean;
};

export function useReservedLookup(reserved?: ReservedCards): ReservedLookup {
  return useMemo(() => {
    const listed = new Set(reserved?.listed ?? []);
    const offered = new Set(reserved?.offered ?? []);
    return {
      listed,
      offered,
      has: (id: string) => listed.has(id) || offered.has(id),
    };
  }, [reserved]);
}

type ReservedStatus = { listed: boolean; offered: boolean };

export function useReservedExplainer() {
  const [status, setStatus] = useState<ReservedStatus | null>(null);
  const open = (s: ReservedStatus) => setStatus(s);

  const node = (
    <Drawer open={!!status} onOpenChange={(o) => !o && setStatus(null)}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Карта занята на рынке</DrawerTitle>
          <DrawerDescription>
            Если вы отдадите эту карту в трейде, связанные записи будут
            автоматически отменены:
          </DrawerDescription>
        </DrawerHeader>
        <div className="space-y-2 px-4 pb-8">
          {status?.listed && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <span className="rounded-md bg-amber-500 p-1.5">
                <Tag className="h-4 w-4 text-white" />
              </span>
              <div>
                <p className="text-sm font-medium">Выставлена на рынке</p>
                <p className="text-xs text-muted-foreground">
                  Ваш активный лот с этой картой будет снят.
                </p>
              </div>
            </div>
          )}
          {status?.offered && (
            <div className="flex items-start gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
              <span className="rounded-md bg-violet-500 p-1.5">
                <Gavel className="h-4 w-4 text-white" />
              </span>
              <div>
                <p className="text-sm font-medium">Участвует в вашем оффере</p>
                <p className="text-xs text-muted-foreground">
                  Ваш оффер с этой картой будет отменён.
                </p>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );

  return { open, node };
}

export function ReservedBadges({
  listed,
  offered,
  onExplain,
}: {
  listed: boolean;
  offered: boolean;
  onExplain: (status: ReservedStatus) => void;
}) {
  if (!listed && !offered) return null;
  const explain = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExplain({ listed, offered });
  };
  return (
    <div className="absolute bottom-1 right-1 flex flex-col gap-1">
      {listed && (
        <button
          type="button"
          onClick={explain}
          className="rounded-md bg-amber-500/90 p-1 shadow-sm ring-1 ring-black/10"
          title="Выставлена на рынке"
        >
          <Tag className="h-3 w-3 text-white" />
        </button>
      )}
      {offered && (
        <button
          type="button"
          onClick={explain}
          className="rounded-md bg-violet-500/90 p-1 shadow-sm ring-1 ring-black/10"
          title="Участвует в вашем оффере"
        >
          <Gavel className="h-3 w-3 text-white" />
        </button>
      )}
    </div>
  );
}

export function ReservedTradeWarning({
  cards,
  reserved,
}: {
  cards: FullCard[];
  reserved: ReservedLookup;
}) {
  const affected = cards.filter((c) => reserved.has(c.id)).length;
  if (affected === 0) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-600">
      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <p className="text-[11px] leading-snug">
        {affected} из выбранных карт сейчас на рынке или в вашем оффере. После
        завершения трейда эти листинги и офферы будут отменены.
      </p>
    </div>
  );
}

export default function TradePage({ receiver }: { receiver: string }) {
  const { userId } = useTelegram();

  useTelegramBackButton("/trade");

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
  const { data: filterData } = useDiffFilterOptions(userId, receiver);

  if (query.data && filterData) {
    return (
      <main className="flex h-full flex-col gap-2 md:container">
        <TradePageContent
          user={query.data.user}
          receiver={receiver}
          filterOptions={filterData.filterOptions}
          reserved={query.data.reserved}
        />
      </main>
    );
  }
  return (
    <main className="flex h-full flex-col gap-2 md:container">
      <Header title="Трейд" />
      <div className="flex items-center justify-between px-3">
        <Skeleton className="h-5 w-[240px] rounded-full" />
        <Skeleton className="h-5 w-11 rounded-full" />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-20 pt-2">
        <ul className="grid grid-cols-4 gap-2">
          {new Array(16).fill(0).map((_, idx) => (
            <li key={idx}>
              <Skeleton className="aspect-[3/4] rounded-md" />
            </li>
          ))}
        </ul>
      </div>
      <div className="fixed bottom-0 left-0 flex w-full gap-4 border-t bg-card p-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </main>
  );
}

type Steps = "select" | "confirm";

function TradePageContent({
  user,
  filterOptions,
  receiver,
  reserved,
}: {
  user: UserExtended;
  filterOptions: FilterOption[];
  receiver: string;
  reserved?: ReservedCards;
}) {
  const reservedLookup = useReservedLookup(reserved);
  const filterState = useCardsFilterState();
  const { selectedCards, resetSelected, onCardSelect } = useCardSelect();
  const router = useRouter();
  const [step, setStep] = useState<Steps>("select");
  const [isLoading, setIsLoading] = useState(false);
  const maxCardsPerTrade = user.isPremium
    ? MAX_CARDS_PER_TRADE.premium
    : MAX_CARDS_PER_TRADE.basic;

  const handleTrade = async () => {
    setIsLoading(true);
    if (selectedCards.length === 0) {
      toast.warning("Пожалуйста, выберите хотя бы одну карту для обмена.");
      setIsLoading(false);
      return;
    }
    if (selectedCards.length > maxCardsPerTrade) {
      toast.warning(
        `Максимальное количество выбираемых карт - ${maxCardsPerTrade}.`
      );
      setIsLoading(false);
      return;
    }

    const data: CreateTradeType = {
      receiverId: receiver,
      cardIds: selectedCards.map((c) => c.id),
    };

    try {
      await api.post("/api/trade/create", data);
      toast.success(`Трейд ${selectedCards.length} карт отправлен`);
      router.push(`/trade`);
    } catch (e) {
      showApiError(e, "Не удалось отправить трейд");
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
              defaultSort={filterState.filter.sort}
              filterOptions={filterOptions}
              setFilters={filterState.handleFilterChange}
            />
          ) : undefined
        }
      />

      <div className="flex items-center justify-between px-3">
        <StepIndicator
          currentStep={step === "select" ? 1 : 2}
          steps={["Выбор карт", "Подтверждение"]}
        />
        <Badge variant="secondary" className="text-[10px]">
          {selectedCards.length}/{maxCardsPerTrade}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-20 pt-2">
        <div
          key={step}
          className="duration-300 animate-in fade-in-0 slide-in-from-bottom-2"
        >
          {step === "select" ? (
            <TradeCardsList
              secondId={receiver}
              selectedCards={selectedCards}
              onCardSelect={onCardSelect}
              reserved={reservedLookup}
              {...filterState}
            />
          ) : (
            <div className="space-y-4">
              <ReservedTradeWarning
                cards={selectedCards}
                reserved={reservedLookup}
              />
              <SelectedCardsList
                selectedCards={selectedCards}
                onClick={onCardSelect}
                reserved={reservedLookup}
              />
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 flex w-full gap-4 border-t bg-card p-4">
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

export type TradeCardsData = {
  total: number;
  cards: FullCard[];
};

export async function fetchTradeCards(
  filter: Filter,
  page: number,
  secondId: string
): Promise<TradeCardsData | undefined> {
  const { data } = await api.get<TradeCardsData | undefined>(
    `/api/user/cards/difference`,
    {
      params: {
        page: page,
        filter: JSON.stringify(filter),
        secondId,
      },
    }
  );
  return data;
}

export function TradeCardsList({
  secondId,
  filter,
  page,
  selectedCards,
  onCardSelect,
  handleChangePage,
  reserved,
}: {
  page: number;
  selectedCards: FullCard[];
  filter: Filter;
  secondId: string;
  handleChangePage: (page: number) => void;
  onCardSelect: (card: FullCard) => () => void;
  reserved?: ReservedLookup;
}) {
  const fetchFn = useCallback(
    (filter: Filter, page: number) => fetchTradeCards(filter, page, secondId),
    [secondId]
  );
  const query = usePaginatedCardsQuery<TradeCardsData>({
    queryKey: ["trade-cards", secondId],
    filter,
    page,
    fetchFn,
  });
  if (!query.data) return <CardsListSkeleton className="px-0" />;
  return (
    <CardsSelectListServer
      cards={query.data.cards}
      selectedCards={selectedCards}
      onClick={onCardSelect}
      page={page}
      total={query.data.total}
      onPageChange={handleChangePage}
      reserved={reserved}
    />
  );
}

type SelectedCardsListProps = {
  selectedCards: FullCard[];
  onClick: (card: FullCard) => () => void;
  reserved?: ReservedLookup;
  cols?: 4 | 5;
};

export function SelectedCardsList({
  selectedCards,
  onClick,
  reserved,
  cols = 4,
}: SelectedCardsListProps) {
  const explainer = useReservedExplainer();
  return (
    <ul className={`grid gap-2 ${cols === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
      {explainer.node}
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
          <div className="absolute right-1 top-1 rounded-full bg-primary p-1">
            <CheckIcon className="h-3 w-3 text-primary-foreground" />
          </div>
          {reserved && (
            <ReservedBadges
              listed={reserved.listed.has(card.id)}
              offered={reserved.offered.has(card.id)}
              onExplain={explainer.open}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
