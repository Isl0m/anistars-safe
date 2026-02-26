"use client";

import Image from "next/image";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { CardUpgrades } from "@/lib/queries";

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";

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
    <>
      <Header title={"Улучшения"} />

      <section className="my-4">
        {query.data && query.data?.length > 0 ? (
          <div className="md:container">
            <div className="grid grid-cols-1 gap-2 md:gap-4 lg:grid-cols-2">
              {query.data.map(({ id, name, baseImage, image1, image2 }) => (
                <Card key={id}>
                  <CardHeader>
                    <CardTitle>{name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Image
                        src={baseImage}
                        width={180}
                        height={240}
                        alt={"card1"}
                        className="rounded-lg"
                        loading="lazy"
                      />
                      <Image
                        src={image1}
                        width={180}
                        height={240}
                        alt={"card2"}
                        className="rounded-lg"
                        loading="lazy"
                      />
                      {image2 && (
                        <Image
                          src={image2}
                          width={180}
                          height={240}
                          alt={"card3"}
                          className="rounded-lg"
                          loading="lazy"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <h1 className="text-center text-2xl font-bold">
            Нет доступных улучшений
          </h1>
        )}
      </section>
    </>
  );
}
