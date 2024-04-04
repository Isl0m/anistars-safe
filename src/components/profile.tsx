"use client";

import { useEffect, useState } from "react";

import { TelegramProvider, useTelegram } from "@/components/telegram-provider";
import { FilterOption } from "@/app/page";
import { Card } from "@/db/schema/card";
import { User } from "@/db/schema/user";

import { CardsList } from "./cards-list";

type Props = {
  filterOptions: FilterOption[];
};

function Profile({ filterOptions }: Props) {
  const { user: tgUser } = useTelegram();
  const [user, setUser] = useState<User>();
  const [cards, setCards] = useState<Card[]>();

  useEffect(() => {
    if (tgUser) {
      fetch(`${process.env.NEXT_PUBLIC_URL}/api/user?id=${tgUser.id}`)
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
          Игрок не найден
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
        <CardsList cards={cards} filterOptions={filterOptions} />
      ) : null}
    </main>
  );
}

export const ProfileWithProvider = (props: Props) => {
  return (
    <TelegramProvider>
      <Profile {...props} />
    </TelegramProvider>
  );
};
