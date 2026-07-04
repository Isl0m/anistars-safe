"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckIcon,
  Gavel,
  Loader2,
  Package,
  Tag,
} from "lucide-react";

import { CARDS_PER_PAGE } from "@/lib/constants";
import { getImageProxyUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { toast } from "@/components/ui/use-toast";
import { CreateTradeType } from "@/app/api/trade/create/route";
import { FullCard } from "@/db/schema/card";
import { UserExtended } from "@/db/schema/user";
import { Badge } from "@/ui/badge";
import { Skeleton } from "@/ui/skeleton";

import CardsFilter from "../cards-filter";
import { Filter, FilterOption } from "../get-filter-options";
import { Header } from "../header";
import CardsPagination from "../pagination";
import { StepIndicator } from "../step-indicator";
import { useTelegram } from "../telegram-provider";
import { useApi } from "../use-api";
import { useCardSelect } from "../use-card-select";
import { useClientPagination } from "../use-client-pagination";
import { useTelegramBackButton } from "../use-telegram-back-button";

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
        <TradePageContent
          user={query.data.user}
          cards={query.data.cards}
          receiver={receiver}
          filterOptions={query.data.filterOptions}
          reserved={query.data.reserved}
          setFilters={handleFilterChange}
        />
      </main>
    );
  }
  return (
    <main className="flex h-full flex-col gap-4 md:container">
      <Header title="Трейд" />
      <div className="flex items-center justify-between px-3 pb-1">
        <Skeleton className="h-7 w-44 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
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
      <div className="fixed bottom-0 left-0 flex w-full gap-3 border-t bg-card p-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </main>
  );
}

type Steps = "select" | "confirm";

function TradePageContent({
  user,
  cards,
  filterOptions,
  receiver,
  reserved,
  setFilters,
}: {
  user: UserExtended;
  cards: FullCard[];
  filterOptions: FilterOption[];
  receiver: string;
  reserved?: ReservedCards;
  setFilters: (filters: Filter) => void;
}) {
  const reservedLookup = useReservedLookup(reserved);
  const {
    page,
    setPage,
    pageItems: pageCards,
    cardsLeft,
  } = useClientPagination(cards, CARDS_PER_PAGE);

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

      <div className="flex-1 overflow-y-auto px-2 pb-20 pt-2">
        <div
          key={step}
          className="duration-300 animate-in fade-in-0 slide-in-from-bottom-2"
        >
          {step === "select" ? (
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
  reserved?: ReservedLookup;
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
  reserved,
  pagination: { page, cardsLeft, changePage },
}: CardsSelectListProps) {
  const explainer = useReservedExplainer();
  return (
    <section className="flex flex-col gap-4">
      {explainer.node}
      {pageCards.length > 0 ? (
        <div className="space-y-4">
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
                  {reserved && (
                    <ReservedBadges
                      listed={reserved.listed.has(card.id)}
                      offered={reserved.offered.has(card.id)}
                      onExplain={explainer.open}
                    />
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
