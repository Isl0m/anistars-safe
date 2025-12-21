"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { User } from "@/db/schema/user";

import { CardsListSkeleton } from "../cards-list-skeleton";
import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { UniverseCard } from "../universe-card";

type UserCollection = {
  id: number;
  name: string;
  totalCards: number;
  userCards: number;
}[];

export function Collection() {
  const { tgUser } = useTelegram();

  const query = useQuery({
    queryKey: ["user-collection"],
    queryFn: async () => {
      // if (!tgUser) return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/collection?id=${tgUser?.id || "6718135090"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );
      return (await response.json()) as Promise<{
        user: User;
        collection: UserCollection;
      }>;
    },
    placeholderData: keepPreviousData,
  });

  if (query.data) {
    return (
      <main className="flex min-h-screen flex-col gap-4 md:container">
        <Header title="Коллекция" />

        <div className="grid gap-3">
          {query.data.collection?.map((universe) => (
            <UniverseCard key={universe.id} {...universe} />
          ))}
        </div>
      </main>
    );
  }
  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <Header title={"Профиль"} />
      <CardsListSkeleton />
    </main>
  );
}
