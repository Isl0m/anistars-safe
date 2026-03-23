"use client";

import Image from "next/image";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { CardUpgrades } from "@/lib/queries";
import { getProxyUrl } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";

import { Header } from "../header";

export function CardUpgradesPage() {
  const query = useQuery({
    queryKey: ["cardUpgrades"],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/cards/upgrade`
      );
      return (await response.json()).upgrdes as Promise<CardUpgrades[]>;
    },
    placeholderData: keepPreviousData,
  });

  return (
    <main className="flex h-full flex-col">
      <Header title={"Улучшения"} />

      <section className="flex-1 overflow-y-auto px-2 py-4">
        <div className="grid grid-cols-1 gap-2 md:container md:gap-4 lg:grid-cols-2">
          {query.isLoading
            ? new Array(6)
                .fill(null)
                .map((_, i) => (
                  <Skeleton key={i} className="h-56 rounded-lg md:h-72" />
                ))
            : query.data?.map(({ id, name, baseImage, image1, image2 }) => (
                <Card key={id}>
                  <CardHeader className="p-4">
                    <CardTitle className="text-xl md:text-2xl">
                      {name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Image
                        src={getProxyUrl(baseImage)}
                        width={180}
                        height={240}
                        alt={"card1"}
                        className="rounded-md md:rounded-lg"
                        loading="lazy"
                      />
                      <Image
                        src={getProxyUrl(image1)}
                        width={180}
                        height={240}
                        alt={"card2"}
                        className="rounded-md md:rounded-lg"
                        loading="lazy"
                      />
                      {image2 && (
                        <Image
                          src={getProxyUrl(image2)}
                          width={180}
                          height={240}
                          alt={"card3"}
                          className="rounded-md md:rounded-lg"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>
      </section>
    </main>
  );
}
