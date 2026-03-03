"use client";

import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { on, postEvent } from "@telegram-apps/sdk-react";

import { FullCard } from "@/db/schema/card";
import { User } from "@/db/schema/user";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { toast } from "@/ui/use-toast";

import CardsFilter from "../cards-filter";
import { CardsList } from "../cards-list";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filte-options";
import { Header } from "../header";
import { useTelegram } from "../telegram-provider";

export function Profile() {
  const { tgUser } = useTelegram();
  const [filter, setFilter] = useState<Filter>();

  const query = useQuery({
    queryKey: ["profile-cards", filter],
    queryFn: async () => {
      if (!tgUser) return;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/cards?id=${tgUser.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(filter ?? {}),
        }
      );
      return (await response.json()) as Promise<{
        cards: FullCard[];
        user: User;
        filterOptions: FilterOption[];
      }>;
    },
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = (data: Filter) => {
    setFilter(data);
  };

  if (query.data) {
    return (
      <main className="flex min-h-screen flex-col gap-4">
        <Header
          title={query.data.user.name}
          element={
            <CardsFilter
              filterOptions={query.data.filterOptions}
              setFilters={handleFilterChange}
            />
          }
        />
        <CardsList cards={query.data.cards} />
      </main>
    );
  }
  return (
    <main className="flex min-h-screen flex-col gap-4">
      <Header title={"Профиль"} />
      <CardsListSkeleton />
    </main>
  );
}

type SearchProfileProps = {
  user: User;
};
export function SearchProfile({ user }: SearchProfileProps) {
  const router = useRouter();
  const { tgUser } = useTelegram();
  if (tgUser) {
    postEvent("web_app_setup_back_button", { is_visible: true });
    on("back_button_pressed", (payload) => {
      postEvent("web_app_setup_back_button", { is_visible: false });
      router.replace("/profile/search");
    });
  }

  const [filter, setFilter] = useState<Filter>();

  const query = useQuery({
    queryKey: ["others-profile-cards", filter],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/cards?id=${user.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(filter ?? {}),
        }
      );
      return (await response.json()) as Promise<{
        cards: FullCard[];
        user: User;
        filterOptions: FilterOption[];
      }>;
    },
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = (data: Filter) => {
    setFilter(data);
  };

  if (query.data) {
    return (
      <main className="flex min-h-screen flex-col gap-4">
        <Header
          title={query.data.user.name}
          element={
            <CardsFilter
              filterOptions={query.data.filterOptions}
              setFilters={handleFilterChange}
            />
          }
        />
        <CardsList cards={query.data.cards} />
      </main>
    );
  }
  return (
    <main className="flex min-h-screen flex-col gap-4">
      <Header title={user.name} />
      <CardsListSkeleton />
    </main>
  );
}

export function SearchFirstProfile() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchId, setSearchId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const data = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/check?id=${searchId}`
      ).then((res) => res.json());
      router.push(createQueryString("userId", searchId));
      setIsLoading(false);
    } catch (e) {
      toast({
        title: "Ошибка",
        description: "Пользователь не найден",
        variant: "destructive",
      });
      console.log(e);
      setIsLoading(false);
    }
  };
  return (
    <>
      <Header title="AniStars" />
      <main className="flex min-h-screen flex-col gap-4 px-4 py-12 md:container">
        <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
          Введите ID пользователь
        </h1>
        <Input
          className="w-full max-w-96"
          value={searchId}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="00000000000"
        />
        <Button onClick={handleSubmit} disabled={!searchId || isLoading}>
          Посмотреть
        </Button>
      </main>
    </>
  );
}
