"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { on, postEvent } from "@telegram-apps/sdk-react";

import { FullCard } from "@/db/schema/card";
import { User } from "@/db/schema/user";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { toast } from "@/ui/use-toast";

import { CardsList } from "../cards-list";
import { FilterOption } from "../get-filte-options";
import { useTelegram } from "../telegram-provider";

export function Profile() {
  const { tgUser } = useTelegram();

  const [user, setUser] = useState<User>();
  const [cards, setCards] = useState<FullCard[]>();
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>();

  useEffect(() => {
    if (tgUser) {
      fetch(`${process.env.NEXT_PUBLIC_URL}/api/user/cards?id=${tgUser.id}`)
        .then((res) => res.json())
        .then((data) => {
          setUser(data.user);
          setCards(data.cards);
          setFilterOptions(data.filterOptions);
        });
    }
  }, [tgUser]);

  if (!user || !filterOptions) {
    return (
      <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
        <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
          Загрузка...
        </h1>
      </main>
    );
  }
  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
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
  user: User;
};
export function SearchProfile({
  user,
  cards,
  filterOptions,
}: SearchProfileProps) {
  const router = useRouter();
  postEvent("web_app_setup_back_button", { is_visible: true });
  on("back_button_pressed", (payload) => {
    postEvent("web_app_setup_back_button", { is_visible: false });
    router.replace("/profile/search");
  });
  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
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
  );
}
