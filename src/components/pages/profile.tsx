"use client";

import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Calendar, ChevronRight, Crown, Loader2, Search, Users } from "lucide-react";

import { FullCard } from "@/db/schema/card";
import { UserExtended } from "@/db/schema/user";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { toast } from "@/ui/use-toast";

import CardsFilter from "../cards-filter";
import { CardsList } from "../cards-list";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filter-options";
import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { useTelegramBackButton } from "../use-telegram-back-button";
import { UserLink } from "../user-link";

type ProfileCardsData = {
  cards: FullCard[];
  user: UserExtended;
  filterOptions: FilterOption[];
};

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
      return (await response.json()) as Promise<ProfileCardsData>;
    },
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = (data: Filter) => {
    setFilter(data);
  };

  return (
    <main className="flex h-full flex-col">
      <Header
        title={query.data?.user.name ?? "Мои карты"}
        element={
          query.data ? (
            <CardsFilter
              filterOptions={query.data.filterOptions}
              setFilters={handleFilterChange}
            />
          ) : undefined
        }
      />
      <section className="flex-1 overflow-y-auto">
        {query.data ? (
          <CardsList cards={query.data.cards} />
        ) : (
          <CardsListSkeleton />
        )}
      </section>
    </main>
  );
}

type SearchProfileProps = {
  user: UserExtended | (Omit<UserExtended, "isPremium"> & { isPremium: boolean | null });
};

export function SearchProfile({ user }: SearchProfileProps) {
  useTelegramBackButton();

  const [filter, setFilter] = useState<Filter>();

  const cardsQuery = useQuery({
    queryKey: ["others-profile-cards", user.id, filter],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/cards?id=${user.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filter ?? {}),
        }
      );
      return (await response.json()) as Promise<ProfileCardsData>;
    },
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = (data: Filter) => {
    setFilter(data);
  };

  return (
    <main className="flex h-full flex-col">
      <Header
        title="Профиль игрока"
        element={
          cardsQuery.data ? (
            <CardsFilter
              filterOptions={cardsQuery.data.filterOptions}
              setFilters={handleFilterChange}
            />
          ) : undefined
        }
      />
      <section className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-3 md:container">
          {/* User card */}
          <UserLink
            userId={user.id}
            name={user.name}
            photoUrl={user.photoUrl}
            size={48}
            avatarClassName="ring-2 ring-card"
            className="gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/30"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold">{user.name}</h2>
                {user.isPremium && (
                  <Badge className="gap-1 bg-amber-500/15 px-1.5 py-0 text-[10px] text-amber-500 hover:bg-amber-500/25">
                    <Crown className="h-2.5 w-2.5" />
                    Premium
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span>ID: {user.id}</span>
                {user.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(user.createdAt)}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </UserLink>

          {/* Cards */}
          {cardsQuery.data ? (
            <CardsList cards={cardsQuery.data.cards} />
          ) : (
            <CardsListSkeleton />
          )}
        </div>
      </section>
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
    [searchParams, pathname]
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/check?id=${searchId}`
      );
      if (!res.ok) throw new Error("not found");
      router.push(createQueryString("userId", searchId));
    } catch (e) {
      toast({
        title: "Ошибка",
        description: "Пользователь не найден",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex h-full flex-col">
      <Header title="Поиск игроков" />
      <section className="flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col items-center gap-6 md:container">
          <div className="flex flex-col items-center gap-3 pt-8">
            <div className="rounded-full bg-muted p-4">
              <Users className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-center text-lg font-bold">Поиск игрока</h2>
            <p className="text-center text-sm text-muted-foreground">
              Введите ID пользователя чтобы посмотреть его профиль и карты
            </p>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={searchId}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="ID пользователя"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!searchId || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Посмотреть
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
