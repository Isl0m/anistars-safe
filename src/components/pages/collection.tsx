"use client";

import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Skeleton } from "@/ui/skeleton";

import { CollectionProgress } from "../collection-progress";
import { Header } from "../header";
import { useTelegram } from "../telegram-provider";

type UserCollection = {
  id: number;
  name: string;
  totalCards: number;
  userCards: number;
  percentage: number;
}[];

export function Collection() {
  const { tgUser } = useTelegram();

  const query = useQuery({
    queryKey: ["user-collection"],
    queryFn: async () => {
      // if (!tgUser) return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/collection?id=${tgUser?.id || "6718135090"}`
      );
      return (await response.json()).collection as Promise<UserCollection>;
    },
    placeholderData: keepPreviousData,
  });

  return (
    <main className="flex h-full flex-col">
      <Header title={"Коллекция"} />
      <section className="flex-1 overflow-y-auto px-2 py-4">
        <div className="flex flex-col gap-2 md:container">
          {query.isLoading
            ? new Array(6)
                .fill(null)
                .map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)
            : query.data?.map((universe) => (
                <Link
                  key={universe.id}
                  href={`/profile/collection/${universe.id}`}
                >
                  <CollectionProgress {...universe} />
                </Link>
              ))}
        </div>
      </section>
    </main>
  );
}
