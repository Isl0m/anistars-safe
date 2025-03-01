"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowDown, X } from "lucide-react";

import { TradeHistory as TradeHistoryType } from "@/lib/queries";

import { Card } from "@/db/schema/card";
import { User } from "@/db/schema/user";
import { Button } from "@/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/ui/drawer";

import { Header } from "../header";
import CardsPagination from "../pagination";
import { useTelegram } from "../telegram-provider";

export function TradeHistory() {
  const { tgUser } = useTelegram();
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryType[]>([]);
  const [page, setPage] = useState(1);
  let cardsPerPage = 3;
  const cardsLeft = tradeHistory.length - page * cardsPerPage;

  const skip = (page - 1) * cardsPerPage;
  const pageTradeHistory = tradeHistory.slice(skip, skip + cardsPerPage);

  const handleChangePage = (page: number) => {
    setPage(page);
  };

  useEffect(() => {
    if (tgUser) {
      fetch(`${process.env.NEXT_PUBLIC_URL}/api/trade/history?id=${tgUser.id}`)
        .then((res) => res.json())
        .then((data) => {
          setTradeHistory(data.tradeHistory);
        });
    }
  }, [tgUser]);

  if (!tradeHistory || !tradeHistory.length) {
    return (
      <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
        <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
          Загрузка.....
        </h1>
      </main>
    );
  }
  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <Header title="История Трейдов" />
      <div className="space-y-1 p-2">
        {pageTradeHistory.map((trade) => (
          <div
            key={trade.id}
            className="border-b border-border bg-card px-2 py-2"
          >
            <div className="flex items-start justify-between">
              {/* Users */}
              <div className="flex flex-col items-start gap-1">
                <UserDisplay user={trade.sender} role="Отправитель" />
                <ArrowDown className="mx-auto h-3 w-3 text-muted-foreground" />
                <UserDisplay user={trade.receiver} role="Получатель" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {Intl.DateTimeFormat("ru-RU", {
                      year: "2-digit",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    }).format(new Date(trade.createdAt))}
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div className="flex flex-col items-end gap-1">
                <CardPreview cards={trade.senderCards} />
                <CardPreview cards={trade.receiverCards} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <CardsPagination
        page={page}
        cardsLeft={cardsLeft}
        handleChangePage={handleChangePage}
      />
    </main>
  );
}

function UserDisplay({ user, role }: { user: User; role: string }) {
  return (
    <div className="flex flex-col">
      <span className="max-w-[100px] truncate text-xs font-medium">
        {user.name}
      </span>
      <span className="text-[10px] text-muted-foreground">{role}</span>
    </div>
  );
}

function CardPreview({ cards }: { cards: Card[] }) {
  const visibleCards = cards.slice(0, 5);
  const remainingCards = cards.length - visibleCards.length;

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <div className="flex items-center">
          <div className="flex -space-x-3">
            {visibleCards.map((card) => (
              <div
                key={card.id}
                className="relative overflow-hidden rounded-sm border-2 border-background"
              >
                <Image
                  src={card.image}
                  alt={card.name}
                  width={40}
                  height={52}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
          {remainingCards > 0 && (
            <span className="ml-1 text-xs font-medium">+{remainingCards}</span>
          )}
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Карты</DrawerTitle>
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
              className="relative overflow-hidden rounded-md border border-border"
            >
              <Image
                src={card.image}
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
