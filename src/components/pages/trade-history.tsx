"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRightLeft, Clock, History, X } from "lucide-react";

import { api } from "@/lib/api";
import {
  TradeHistory as TradeHistoryType,
  TradeType,
} from "@/lib/queries";
import { cn, getImageProxyUrl, timeAgo } from "@/lib/utils";

import { Card } from "@/db/schema/card";
import { useClientPagination } from "@/hook/use-client-pagination";
import { useTelegramBackButton } from "@/hook/use-telegram-back-button";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/ui/drawer";
import { Skeleton } from "@/ui/skeleton";

import { Header } from "../header";
import CardsPagination from "../pagination";
import { useTelegram } from "../telegram-provider";
import { UserLink } from "../user-link";

const TRADE_TYPE_META: Record<
  TradeType,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  single: { label: "Обмен", variant: "secondary" },
  multi: { label: "Мульти", variant: "default" },
  market: { label: "Маркет", variant: "outline" },
};

const TYPE_FILTERS: { value: TradeType | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "single", label: "Обмен" },
  { value: "multi", label: "Мульти" },
  { value: "market", label: "Маркет" },
];

export function TradeHistory() {
  const { userId } = useTelegram();
  const [typeFilter, setTypeFilter] = useState<TradeType | "all">("all");

  useTelegramBackButton("/trade");

  const query = useQuery({
    queryKey: ["tradeHistroy", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await api.get<TradeHistoryType[]>(`/api/trade/history`, {
        params: { id: userId },
      });
      return data;
    },
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });

  const filteredTrades = useMemo(() => {
    const trades = query.data ?? [];
    if (typeFilter === "all") return trades;
    return trades.filter((trade) => trade.type === typeFilter);
  }, [query.data, typeFilter]);

  const totalTrades = filteredTrades.length;

  const {
    page,
    setPage,
    pageItems: pageTradeHistory,
    cardsLeft,
  } = useClientPagination(filteredTrades, 5);

  return (
    <main className="flex h-full flex-col">
      <Header title="История трейдов" />

      <div className="flex-1 overflow-y-auto px-3 py-4 md:container">
        {!query.data ? (
          <>
            <Skeleton className="mb-2 h-4 w-12" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[146px] w-full rounded-xl" />
              ))}
            </div>
          </>
        ) : query.data.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <div className="rounded-full bg-muted p-4">
              <History className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Нет трейдов
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Ваша история обменов пока пуста
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
              {TYPE_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTypeFilter(filter.value)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    typeFilter === filter.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {filteredTrades.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Нет трейдов этого типа
              </p>
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Всего: {totalTrades}
                  </span>
                </div>
                <div className="space-y-3">
                  {pageTradeHistory.map((trade) => (
                    <TradeHistoryCard
                      key={`${trade.type}-${trade.id}`}
                      trade={trade}
                    />
                  ))}
                </div>

                <div className="mt-4">
                  <CardsPagination
                    page={page}
                    cardsLeft={cardsLeft}
                    handleChangePage={setPage}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function TradeHistoryCard({ trade }: { trade: TradeHistoryType }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeAgo(trade.createdAt)}
        </div>
        <Badge
          variant={TRADE_TYPE_META[trade.type].variant}
          className="h-5 px-1.5 py-0 text-[10px]"
        >
          {TRADE_TYPE_META[trade.type].label}
        </Badge>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 p-3">
        <div>
          <UserLink
            userId={trade.sender.id}
            name={trade.sender.name}
            photoUrl={trade.sender.photoUrl}
            size={24}
            className="mb-2 gap-1.5"
          >
            <span className="truncate text-[11px] font-semibold">
              {trade.sender.name}
            </span>
          </UserLink>
          <CardPreview cards={trade.senderCards} />
        </div>

        <div className="flex items-center self-center pt-5">
          <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <div>
          <UserLink
            userId={trade.receiver.id}
            name={trade.receiver.name}
            photoUrl={trade.receiver.photoUrl}
            size={24}
            className="mb-2 flex-row-reverse justify-end gap-1.5"
            avatarClassName="bg-secondary text-secondary-foreground"
          >
            <span className="truncate text-[11px] font-semibold">
              {trade.receiver.name}
            </span>
          </UserLink>
          <CardPreview cards={trade.receiverCards} />
        </div>
      </div>
    </div>
  );
}

function CardPreview({ cards }: { cards: Card[] }) {
  const visibleCards = cards.slice(0, 4);
  const remainingCards = cards.length - visibleCards.length;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className={`flex items-center gap-1.5`}>
          <div className={`flex -space-x-2`}>
            {visibleCards.map((card) => (
              <div
                key={card.id}
                className="relative h-14 w-10 overflow-hidden rounded-md border-2 border-card shadow-sm"
              >
                <Image
                  src={getImageProxyUrl(card.image)}
                  alt={card.name}
                  fill
                  sizes="300px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          {remainingCards > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 py-0 text-[10px]">
              +{remainingCards}
            </Badge>
          )}
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Карты ({cards.length})</DrawerTitle>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="grid max-h-[calc(100vh-8rem)] grid-cols-4 gap-2 overflow-y-auto p-4 sm:grid-cols-5 md:grid-cols-6">
          {cards.map((card, index) => (
            <div
              key={index}
              className="relative mb-4 overflow-hidden rounded-lg border border-border shadow-sm"
            >
              <Image
                src={getImageProxyUrl(card.image)}
                alt={card.name}
                width={60}
                height={80}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
