"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { FullCard } from "@/db/schema/card";
import { User } from "@/db/schema/user";

import { CardsList } from "./cards-list";
import { FilterOption } from "./get-filte-options";
import { useTelegram } from "./telegram-provider";
import { Input } from "./ui/input";

type ProfileProps = {
  filterOptions: FilterOption[];
};

export function Profile({ filterOptions }: ProfileProps) {
  const { user: tgUser } = useTelegram();

  const [user, setUser] = useState<User>();
  const [cards, setCards] = useState<FullCard[]>();

  useEffect(() => {
    if (tgUser) {
      fetch(`${process.env.NEXT_PUBLIC_URL}/api/user?id=${tgUser?.id}`)
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
    <main className="flex min-h-screen flex-col gap-4 p-4 md:container">
      {cards?.length ? (
        <CardsList
          title={user.name}
          cards={cards}
          filterOptions={filterOptions}
        />
      ) : null}
    </main>
  );
}

type SearchProfileProps = {
  userId: string;
  filterOptions: FilterOption[];
  cards: FullCard[];
  user: User | null;
};
export function SearchProfile({
  user,
  cards,
  filterOptions,
}: SearchProfileProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchId, setSearchId] = useState(user?.id || "");
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);

      return `${pathname}?${params.toString()}`;
    },
    [searchParams]
  );
  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchId(e.target.value);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      router.push(createQueryString("userId", searchId));
    }
  };
  return (
    <main className="flex min-h-screen flex-col gap-4 p-4  md:container">
      {!user && (
        <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
          Пользователь не найден
        </h1>
      )}
      <Input
        className="w-full max-w-96"
        value={searchId}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Enter user ID..."
      />

      {cards?.length && user ? (
        <CardsList
          title={user.name}
          cards={cards}
          filterOptions={filterOptions}
        />
      ) : null}
    </main>
  );
}

export function SearchFirstProfile() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchId, setSearchId] = useState("");
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);

      return `${pathname}?${params.toString()}`;
    },
    [searchParams]
  );
  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchId(e.target.value);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      router.push(createQueryString("userId", searchId));
    }
  };
  return (
    <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
      <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
        Введите ID пользователь
      </h1>
      <Input
        className="w-full max-w-96"
        value={searchId}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Enter user ID..."
      />
    </main>
  );
}
