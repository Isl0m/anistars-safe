"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import { TrialTowerRewardWithCard } from "@/lib/queries";
import { getProxyUrl, prettyNumbers } from "@/lib/utils";

import Pagination from "@/components/pagination";
import { Card } from "@/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";

import { Header } from "../header";

type Props = {
  initialRewards: TrialTowerRewardWithCard[];
};

const ITEMS_PER_PAGE = 12;

export function TrialTowerPage({ initialRewards }: Props) {
  const scrollRef = useRef<HTMLElement>(null);
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({
    legendary: 1,
    epic: 1,
    base: 1,
  });

  const rewardsByPool = initialRewards.reduce(
    (acc, reward) => {
      if (!acc[reward.pool]) acc[reward.pool] = [];
      acc[reward.pool].push(reward);
      return acc;
    },
    {} as Record<string, TrialTowerRewardWithCard[]>
  );

  const poolTitles = {
    base: "Обычный",
    epic: "Эпический",
    legendary: "Легендарный",
  };

  const pools = ["legendary", "epic", "base"] as const;

  const handlePageChange = (pool: string, page: number) => {
    setCurrentPage((prev) => ({ ...prev, [pool]: page }));
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="flex h-full flex-col">
      <Header title={"Награды Башни Испытаний"} />

      <section
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-4 pb-20 md:container"
      >
        <Tabs defaultValue="legendary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {pools.map(
              (pool) =>
                rewardsByPool[pool] && (
                  <TabsTrigger key={pool} value={pool}>
                    {poolTitles[pool]}
                  </TabsTrigger>
                )
            )}
          </TabsList>

          {pools.map((pool) => {
            const poolRewards = rewardsByPool[pool] || [];
            const page = currentPage[pool] || 1;
            const startIndex = (page - 1) * ITEMS_PER_PAGE;
            const visibleRewards = poolRewards.slice(
              startIndex,
              startIndex + ITEMS_PER_PAGE
            );
            const cardsLeft =
              poolRewards.length - (startIndex + ITEMS_PER_PAGE);

            return (
              <TabsContent
                key={pool}
                value={pool}
                className="mt-6 border-none p-0 outline-none"
              >
                <div className="grid grid-cols-3 gap-2 md:container sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {visibleRewards.map((reward) => (
                    <Card
                      key={reward.id}
                      className="flex flex-col overflow-hidden"
                    >
                      <div className="relative aspect-[3/4] w-full">
                        <Image
                          src={getProxyUrl(reward.card.image)}
                          fill
                          alt={reward.card.name}
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-col gap-0.5 p-1.5">
                        <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                          <div className="flex gap-1">
                            <span>Сток:</span>
                            <span
                              className={
                                reward.stock === 0
                                  ? "text-destructive"
                                  : "text-foreground"
                              }
                            >
                              {reward.stock}/{reward.initialStock}
                            </span>
                          </div>
                          <span className="font-bold text-foreground">
                            {prettyNumbers(reward.card.price)}✨
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {poolRewards.length > ITEMS_PER_PAGE && (
                  <div className="mt-8">
                    <Pagination
                      page={page}
                      cardsLeft={cardsLeft}
                      handleChangePage={(newPage) =>
                        handlePageChange(pool, newPage)
                      }
                    />
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </section>
    </main>
  );
}
