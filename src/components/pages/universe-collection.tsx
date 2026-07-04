"use client";

import Image from "next/image";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { cn, getImageProxyUrl } from "@/lib/utils";

import { Card as CardType } from "@/db/schema/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/accordion";
import { Badge } from "@/ui/badge";
import { Skeleton } from "@/ui/skeleton";

import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { useTelegramBackButton } from "../use-telegram-back-button";

type CardWithOwner = CardType & { isOwned: boolean };

type UniverseCollection = {
  stats: {
    totalInUniverse: number;
    totalOwnedByUser: number;
    universe: string;
  };
  cardsByRarity: Record<string, CardWithOwner[]>;
};

const rarityColors: Record<string, string> = {
  "🟢 Изумрудная": "from-green-500 to-emerald-600",
  "🔵 Алмазная": "from-blue-500 to-indigo-600",
  "🔴 Ивентовая": "from-red-500 to-pink-500",
  "🟡 Золотая": "from-yellow-500 to-amber-600",
  "⚪️ Серебряная": "from-gray-400 to-gray-500",
  "🟤 Бронзовая": "from-orange-500 to-amber-600",
};

export function UniverseCollection({ universeId }: { universeId: number }) {
  const { tgUser } = useTelegram();
  useTelegramBackButton("/profile/collection");

  const query = useQuery({
    queryKey: ["universe-collection", universeId],
    queryFn: async () => {
      // if (!tgUser) return;
      const response = await fetch(
        // `${process.env.NEXT_PUBLIC_URL}/api/user/collection/${universeId}?userId=${tgUser.id}`
        `${process.env.NEXT_PUBLIC_URL}/api/user/collection/${universeId}?userId=${8057167755}`
      );
      return (await response.json()) as Promise<UniverseCollection>;
    },
    placeholderData: keepPreviousData,
  });

  return (
    <main className="flex h-full flex-col">
      <Header title="Коллекция" />

      <section className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-3 md:container">
          {!query.data ? (
            <>
              <Skeleton className="h-[101px] rounded-xl" />
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[57px] rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <div className="rounded-xl border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold">
                    {query.data.stats.universe}
                  </h2>
                  <Badge variant="secondary" className="text-xs">
                    {query.data.stats.totalOwnedByUser}/
                    {query.data.stats.totalInUniverse}
                  </Badge>
                </div>
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Прогресс</span>
                  <span className="font-medium text-foreground">
                    {Math.round(
                      (query.data.stats.totalOwnedByUser /
                        query.data.stats.totalInUniverse) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                    style={{
                      width: `${Math.round((query.data.stats.totalOwnedByUser / query.data.stats.totalInUniverse) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <Accordion type="single" collapsible className="space-y-3">
                {Object.entries(query.data.cardsByRarity).map(
                  ([rarity, cards]) => (
                    <RaritySection key={rarity} rarity={rarity} cards={cards} />
                  )
                )}
              </Accordion>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function RaritySection({
  rarity,
  cards,
}: {
  rarity: string;
  cards: CardWithOwner[];
}) {
  const ownedCount = cards.filter((c) => c.isOwned).length;
  const color = rarityColors[rarity] ?? "from-gray-500 to-gray-600";
  const percentage = Math.round((ownedCount / cards.length) * 100);

  return (
    <AccordionItem value={rarity} className="border-b-0">
      <AccordionTrigger className="rounded-xl border bg-card px-4 py-3 hover:no-underline [&[data-state=open]]:rounded-b-none">
        <div className="flex flex-1 items-center gap-3 pr-2">
          <div
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[10px] font-bold text-white",
              color
            )}
          >
            {percentage}%
          </div>
          <div className="flex-1 text-left">
            <span className="text-sm font-semibold">{rarity}</span>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                  color
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {ownedCount}/{cards.length}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="rounded-b-xl border border-t-0 bg-card px-3 pb-3">
        <div className="grid grid-cols-4 gap-2 pt-2 md:grid-cols-6 lg:grid-cols-8">
          {cards.map((card) => (
            <div
              key={card.id}
              className={cn(
                "relative overflow-hidden rounded-lg border shadow-sm",
                card.isOwned
                  ? "border-green-500/30"
                  : "border-border opacity-40 grayscale"
              )}
            >
              <Image
                src={getImageProxyUrl(card.image)}
                width={240}
                height={320}
                alt={card.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              {card.isOwned && (
                <div className="absolute right-0.5 top-0.5 rounded-full bg-green-500 p-0.5 md:right-1 md:top-1 md:p-1">
                  <Check className="h-2 w-2 text-white md:h-3 md:w-3" />
                </div>
              )}
            </div>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
