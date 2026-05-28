"use client";

import Image from "next/image";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight, Zap } from "lucide-react";

import { CardUpgrades } from "@/lib/queries";
import { getImageProxyUrl } from "@/lib/utils";

import { Badge } from "@/ui/badge";
import { Skeleton } from "@/ui/skeleton";

import { Header } from "../header";

export function CardUpgradesPage() {
  const query = useQuery({
    queryKey: ["cardUpgrades"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/cards/upgrade`
      );
      return (await response.json()).upgrades as Promise<CardUpgrades[]>;
    },
    placeholderData: keepPreviousData,
  });

  return (
    <main className="flex h-full flex-col">
      <Header title="Улучшения" />

      <section className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-3 md:container lg:grid lg:grid-cols-2 lg:gap-4">
          {query.isLoading
            ? [1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))
            : query.data?.map(({ id, name, baseImage, image1, image2 }) => (
                <div
                  key={id}
                  className="overflow-hidden rounded-xl border bg-card"
                >
                  <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-sm font-semibold">{name}</span>
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px]"
                    >
                      {image2 ? "3 уровня" : "2 уровня"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-center gap-2 p-3.5">
                    <div className="flex-1 overflow-hidden rounded-lg border shadow-sm">
                      <Image
                        src={getImageProxyUrl(baseImage)}
                        width={180}
                        height={240}
                        alt={`${name} base`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 overflow-hidden rounded-lg border border-amber-500/30 shadow-sm">
                      <Image
                        src={getImageProxyUrl(image1)}
                        width={180}
                        height={240}
                        alt={`${name} level 1`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    {image2 && (
                      <>
                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 overflow-hidden rounded-lg border border-amber-500/30 shadow-sm">
                          <Image
                            src={getImageProxyUrl(image2)}
                            width={180}
                            height={240}
                            alt={`${name} level 2`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}

          {!query.isLoading && query.data?.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="rounded-full bg-muted p-4">
                <Zap className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                Нет доступных улучшений
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
