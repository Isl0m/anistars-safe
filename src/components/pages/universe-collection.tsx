"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { on, postEvent } from "@telegram-apps/sdk-react";
import { Check } from "lucide-react";

import { Card as CardType } from "@/db/schema/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/accordion";
import { Skeleton } from "@/ui/skeleton";

import { CollectionProgress } from "../collection-progress";
import { Header } from "../header";
import { useTelegram } from "../telegram-provider";

type CardWithOwner = CardType & { isOwned: boolean };

type UniverseCollection = {
  stats: {
    totalInUniverse: number;
    totalOwnedByUser: number;
    universe: string;
  };
  cardsByRarity: Record<string, CardWithOwner[]>;
};

export function UniverseCollection({ universeId }: { universeId: number }) {
  const { tgUser } = useTelegram();
  const router = useRouter();

  useEffect(() => {
    if (!tgUser) return;

    postEvent("web_app_setup_back_button", { is_visible: true });

    const off = on("back_button_pressed", () => {
      router.replace("/profile/collection");
    });

    return () => {
      off();
      postEvent("web_app_setup_back_button", { is_visible: false });
    };
  }, [router, tgUser]);

  const query = useQuery({
    queryKey: ["universe-collection", universeId],
    queryFn: async () => {
      // if (!tgUser) return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/collection/${universeId}?userId=${tgUser?.id || "6718135090"}`
      );
      return (await response.json()) as Promise<UniverseCollection>;
    },
    placeholderData: keepPreviousData,
  });

  return (
    <main className="flex h-full flex-col">
      <Header title={"Коллекция"} />

      <section className="flex-1 overflow-y-auto px-2 py-4">
        <div className="flex flex-col gap-2 md:container">
          {!query.data ? (
            new Array(6)
              .fill(null)
              .map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)
          ) : (
            <>
              <CollectionProgress
                name={query.data.stats.universe}
                userCards={query.data.stats.totalOwnedByUser}
                totalCards={query.data.stats.totalInUniverse}
                percentage={Math.round(
                  (query.data.stats.totalOwnedByUser /
                    query.data.stats.totalInUniverse) *
                    100
                )}
              />

              <Accordion type="single" collapsible className="p-2">
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

const rarityToGradiend = {
  "🟢 Изумрудная": "from-green-500 to-emerald-600",
  "🔵 Алмазная": "from-blue-500 to-indigo-600",
  "🔴 Ивентовая": "from-red-500 to-pink-500",
  "🟡 Золотая": "from-yellow-500 to-amber-600",
  "⚪️ Серебряная": "from-gray-500 to-gray-600",
  "🟤 Бронзовая": "from-orange-500 to-amber-600",
};

function RaritySection({
  rarity,
  cards,
}: {
  rarity: string;
  cards: CardWithOwner[];
}) {
  const ownedCount = cards.filter((c) => c.isOwned).length;
  const color =
    rarity in rarityToGradiend
      ? rarityToGradiend[rarity as keyof typeof rarityToGradiend]
      : undefined;
  return (
    <AccordionItem value={rarity}>
      <AccordionTrigger>
        <CollectionProgress
          isMinimal
          name={rarity}
          userCards={ownedCount}
          totalCards={cards.length}
          percentage={Math.round((ownedCount / cards.length) * 100)}
          className="mr-4 p-0"
          color={color}
        />
      </AccordionTrigger>
      <AccordionContent>
        <div className="grid grid-cols-4 gap-3 md:grid-cols-6 lg:grid-cols-8">
          {cards.map((card) => (
            <div className="relative w-full overflow-hidden rounded-md md:rounded-lg">
              <Image
                src={card.image}
                width={240}
                height={320}
                alt={card.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              {card.isOwned && (
                <div className="absolute right-1 top-1 rounded-full bg-green-500 p-1 md:right-2 md:top-2">
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
