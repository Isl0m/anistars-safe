"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Gift } from "lucide-react";

import type { TrialTowerRewardWithCard } from "@/lib/queries";
import { getImageProxyUrl, prettyNumbers } from "@/lib/utils";

import Pagination from "@/components/pagination";
import { Card } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";

import { Header } from "../header";

const ITEMS_PER_PAGE = 12;

export function TrialTowerPage({
  rewards,
}: {
  rewards: TrialTowerRewardWithCard[];
}) {
  const scrollRef = useRef<HTMLElement>(null);
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({
    legendary: 1,
    epic: 1,
    base: 1,
  });

  const rewardsByPool = (rewards ?? []).reduce(
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
        {!rewards || rewards.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="rounded-full bg-muted p-4">
              <Gift className="h-10 w-10 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Наград пока нет</p>
              <p className="text-xs text-muted-foreground">
                Загляните позже — награды появятся здесь
              </p>
            </div>
          </div>
        ) : (
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
                    {visibleRewards.map((reward, index) => (
                      <Card
                        key={reward.id}
                        className="flex flex-col overflow-hidden"
                      >
                        <div className="relative aspect-[3/4] w-full">
                          <Image
                            src={getImageProxyUrl(reward.card.image)}
                            fill
                            alt={reward.card.name}
                            className="object-cover"
                            {...(pool === "legendary" && index < 6
                              ? { priority: true }
                              : { loading: "lazy" as const })}
                            sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, 33vw"
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
        )}
      </section>
    </main>
  );
}

function TrialTowerSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid w-full grid-cols-3 gap-1 rounded-md bg-muted p-1">
        <Skeleton className="h-9 rounded-sm" />
        <Skeleton className="h-9 rounded-sm" />
        <Skeleton className="h-9 rounded-sm" />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {new Array(ITEMS_PER_PAGE).fill(1).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <Skeleton className="aspect-[3/4] w-full rounded-none" />
            <div className="p-1.5">
              <Skeleton className="h-3 w-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
