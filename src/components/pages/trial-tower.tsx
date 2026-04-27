"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";

import type { TrialTowerRewardWithCard } from "@/lib/queries";
import { getProxyUrl, prettyNumbers } from "@/lib/utils";

import Pagination from "@/components/pagination";
import { Card } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";

import { Header } from "../header";

const ITEMS_PER_PAGE = 12;

export function TrialTowerPage() {
  const scrollRef = useRef<HTMLElement>(null);
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({
    legendary: 1,
    epic: 1,
    base: 1,
  });

  const query = useQuery({
    queryKey: ["trial-tower-rewards"],
    queryFn: async () => {
      const response = await fetch("/api/trial-tower/rewards");

      if (!response.ok) {
        throw new Error("Failed to load trial tower rewards");
      }

      return (await response.json()).rewards as TrialTowerRewardWithCard[];
    },
    staleTime: 60_000,
  });

  const rewardsByPool = useMemo(() => {
    return (query.data ?? []).reduce(
      (acc, reward) => {
        if (!acc[reward.pool]) acc[reward.pool] = [];
        acc[reward.pool].push(reward);
        return acc;
      },
      {} as Record<string, TrialTowerRewardWithCard[]>
    );
  }, [query.data]);

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
        {query.isPending && <TrialTowerSkeleton />}

        {query.isError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Не удалось загрузить награды. Попробуйте открыть страницу позже.
          </div>
        )}

        {query.data && (
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
                            src={getProxyUrl(reward.card.image)}
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
