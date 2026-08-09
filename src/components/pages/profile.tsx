"use client";

import { ChangeEvent, KeyboardEvent, useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Calendar,
  ChevronRight,
  Crown,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

import { FullCard } from "@/db/schema/card";
import { UserExtended } from "@/db/schema/user";
// Type-only: @/lib/queries reaches the database, and this is a client
// component. The `type` keyword guarantees the import is erased.
import type { PublicUser } from "@/lib/queries";
import { useCardsFilterState } from "@/hook/use-cards-filter-state";
import { useFavouriteCards } from "@/hook/use-favourite-cards";
import { useUserFilterOptions } from "@/hook/use-filter-options";
import { usePaginatedCardsQuery } from "@/hook/use-paginated-cards-query";
import { useTelegramBackButton } from "@/hook/use-telegram-back-button";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

import CardsFilter from "../cards-filter";
import { CardsList } from "../cards-list";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter } from "../get-filter-options";
import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { UserLink } from "../user-link";

export type ProfileCardsData = {
  cards: FullCard[];
  total: number;
};

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function fetchProfileCards(
  filter: Filter,
  page: number,
  userId?: number | string
) {
  const { data } = await api.get<ProfileCardsData | undefined>(
    `/api/user/cards`,
    {
      params: {
        page: String(page),
        filter: JSON.stringify(filter),
        id: userId ?? undefined,
      },
    }
  );
  return data;
}

export function Profile() {
  const { userId } = useTelegram();
  const { page, filter, handleChangePage, handleFilterChange } =
    useCardsFilterState();
  const { data: filterData } = useUserFilterOptions(userId);

  const query = usePaginatedCardsQuery<ProfileCardsData>({
    queryKey: ["profile-cards", userId],
    filter,
    page,
    fetchFn: fetchProfileCards,
  });

  const userQuery = useQuery({
    queryKey: ["user-data", userId],
    queryFn: async () => {
      if (!userId) return;
      const { data } = await api.get<{ user: UserExtended }>(`/api/user`);
      return data.user;
    },
    enabled: !!userId,
    placeholderData: keepPreviousData,
  });

  const { favouritesQuery, toggle } = useFavouriteCards(userId);

  return (
    <main className="flex h-full flex-col">
      <Header
        title={userQuery.data?.name ?? "Мои карты"}
        element={
          filterData ? (
            <CardsFilter
              defaultSort={filter.sort}
              filterOptions={filterData.filterOptions}
              setFilters={handleFilterChange}
            />
          ) : undefined
        }
      />
      <section className="flex-1 overflow-y-auto py-4">
        {query.data ? (
          <CardsList
            cards={query.data.cards}
            total={query.data.total}
            page={page}
            onPageChange={handleChangePage}
            favouriteCardIds={favouritesQuery.data}
            onToggleFavourite={toggle}
          />
        ) : (
          <CardsListSkeleton />
        )}
      </section>
    </main>
  );
}

type SearchProfileProps = {
  // Deliberately the public projection, not UserExtended: this is another
  // player, and whatever is typed here is what gets serialised into the RSC
  // payload and shipped to the browser.
  user: PublicUser;
};

export function SearchProfile({ user }: SearchProfileProps) {
  useTelegramBackButton();

  const { page, filter, handleChangePage, handleFilterChange } =
    useCardsFilterState();
  const { data: filterData } = useUserFilterOptions(user.id);

  const fetchFn = useCallback(
    (filter: Filter, page: number) => fetchProfileCards(filter, page, user.id),
    [user]
  );
  const query = usePaginatedCardsQuery<ProfileCardsData>({
    queryKey: ["others-profile-cards", user.id],
    filter,
    page,
    fetchFn,
  });

  return (
    <main className="flex h-full flex-col gap-4">
      <Header
        title="Профиль игрока"
        element={
          filterData ? (
            <CardsFilter
              defaultSort={filter.sort}
              filterOptions={filterData.filterOptions}
              setFilters={handleFilterChange}
            />
          ) : undefined
        }
      />
      <section className="px-2 md:container">
        <UserLink
          userId={user.id}
          name={user.name}
          photoUrl={user.photoUrl}
          size={40}
          avatarClassName="ring-2 ring-card"
          className="gap-4 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:border-primary/30"
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
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
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
      </section>
      <section className="flex-1 overflow-y-auto pb-4">
        {query.data ? (
          <CardsList
            cards={query.data.cards}
            total={query.data.total}
            page={page}
            onPageChange={handleChangePage}
          />
        ) : (
          <CardsListSkeleton />
        )}
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
      const { data } = await api.get<{
        id: string;
        name: string;
        photoUrl: string;
        isCanTrade: boolean;
      }>(`/api/user/check`, {
        params: { id: searchId },
      });
      if (!data) throw new Error("not found");
      router.push(createQueryString("userId", searchId));
    } catch {
      toast.error("Пользователь не найден");
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
