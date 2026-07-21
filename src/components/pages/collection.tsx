"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRight, Library } from "lucide-react";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/ui/skeleton";

import { Header } from "../header";
import { useTelegram } from "../telegram-provider";

type UserCollection = {
  id: number;
  name: string;
  totalCards: number;
  userCards: number;
  percentage: number;
}[];

const gradients = [
  "from-orange-500 to-yellow-500",
  "from-red-600 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-cyan-400",
  "from-purple-600 to-pink-500",
  "from-indigo-500 to-violet-600",
  "from-amber-500 to-orange-600",
  "from-fuchsia-600 to-purple-600",
  "from-pink-500 to-rose-500",
  "from-violet-600 to-indigo-600",
  "from-cyan-500 to-blue-600",
  "from-rose-500 to-red-600",
  "from-teal-400 to-emerald-500",
  "from-lime-500 to-green-600",
  "from-sky-400 to-blue-500",
  "from-yellow-400 to-orange-500",
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

export function Collection() {
  const { userId } = useTelegram();

  const query = useQuery({
    queryKey: ["user-collection", userId],
    queryFn: async () => {
      if (!userId) return;
      const { data } = await api.get<{ collection: UserCollection }>(
        `/api/user/collection`
      );
      return data.collection;
    },
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });

  const totalOwned = query.data?.reduce((s, u) => s + u.userCards, 0) ?? 0;
  const totalCards = query.data?.reduce((s, u) => s + u.totalCards, 0) ?? 0;

  return (
    <main className="flex h-full flex-col">
      <Header title="Коллекция" />
      <section className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-3 md:container">
          {query.isLoading ? (
            <>
              <Skeleton className="h-[70px] rounded-xl" />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-[60px] rounded-xl" />
              ))}
            </>
          ) : (
            <>
              {query.data && query.data.length > 0 && (
                <div className="mb-1 flex items-center justify-between rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <Library className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Общий прогресс</p>
                      <p className="text-xs text-muted-foreground">
                        {totalOwned} из {totalCards} карт
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {totalCards > 0
                      ? Math.round((totalOwned / totalCards) * 100)
                      : 0}
                    %
                  </span>
                </div>
              )}

              {query.data?.map((universe) => {
                const color = getGradient(universe.name);
                return (
                  <Link
                    key={universe.id}
                    href={`/profile/collection/${universe.id}`}
                    className="group block rounded-xl border bg-card transition-colors hover:border-primary/30"
                  >
                    <div className="px-4 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {universe.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {universe.userCards}/{universe.totalCards}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {universe.percentage}%
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full bg-gradient-to-r transition-all duration-500",
                            color
                          )}
                          style={{ width: `${universe.percentage}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}

              {query.data?.length === 0 && (
                <div className="flex flex-col items-center gap-4 py-16">
                  <div className="rounded-full bg-muted p-4">
                    <Library className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Коллекция пока пуста
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
