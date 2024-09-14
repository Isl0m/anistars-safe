"use client";

import { useEffect, useState } from "react";

import { FullCard } from "@/db/schema/card";
import { User } from "@/db/schema/user";

import { CardsList } from "./cards-list";
import { FilterOption } from "./get-filte-options";
import { useTelegram } from "./telegram-provider";

type MissingProps = {
  filterOptions: FilterOption[];
};

export function Missing({ filterOptions }: MissingProps) {
  const { user: tgUser } = useTelegram();
  const [user, setUser] = useState<User>();
  const [cards, setCards] = useState<FullCard[]>();

  useEffect(() => {
    if (tgUser) {
      fetch(`${process.env.NEXT_PUBLIC_URL}/api/user/missing?id=${tgUser?.id}`)
        .then((res) => res.json())
        .then((data) => {
          setUser(data.user);
          setCards(data.cards);
        });
    }
  }, [tgUser]);

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
        <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
          Загрузка...
        </h1>
      </main>
    );
  }
  return (
    <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
      <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
        {user?.name}
      </h1>
      {cards?.length ? (
        <CardsList
          title="Отсуствующие карты"
          cards={cards}
          filterOptions={filterOptions}
        />
      ) : null}
    </main>
  );
}
