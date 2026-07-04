"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRightLeft, Clock, History, X } from "lucide-react";

import { TradeHistory as TradeHistoryType } from "@/lib/queries";
import { getImageProxyUrl, timeAgo } from "@/lib/utils";

import { Card } from "@/db/schema/card";
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
import { useClientPagination } from "../use-client-pagination";
import { useTelegramBackButton } from "../use-telegram-back-button";
import { UserLink } from "../user-link";

export function TradeHistory() {
  const { tgUser } = useTelegram();
  useTelegramBackButton("/trade");
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryType[] | null>(
    null
  );
  const totalTrades = tradeHistory?.length ?? 0;
  const {
    page,
    setPage,
    pageItems: pageTradeHistory,
    cardsLeft,
  } = useClientPagination(tradeHistory ?? [], 5);

  useEffect(() => {
    if (tgUser) {
      fetch(`${process.env.NEXT_PUBLIC_URL}/api/trade/history?id=${tgUser.id}`)
        .then((res) => res.json())
        .then((data) => {
          setTradeHistory(data.tradeHistory);
        });
    }
  }, [tgUser]);

  return (
    <main className="flex h-full flex-col">
      <Header title="История трейдов" />

      <div className="flex-1 overflow-y-auto px-3 py-4 md:container">
        {tradeHistory === null ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="mb-3 flex items-center gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((j) => (
                    <Skeleton key={j} className="h-16 w-12 rounded-md" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : tradeHistory.length === 0 ? (
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
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Всего: {totalTrades}
              </span>
            </div>
            <div className="space-y-3">
              {pageTradeHistory.map((trade) => (
                <TradeHistoryCard key={trade.id} trade={trade} />
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
