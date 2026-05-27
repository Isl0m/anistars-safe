"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { FullCard } from "@/db/schema/card";
import { UserExtended } from "@/db/schema/user";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

import CardsFilter from "../cards-filter";
import { CardsListSkeleton } from "../cards-list-skeleton";
import {
  Filter,
  FilterOption,
  ListingFilterOption,
  ListingFilters,
} from "../get-filter-options";
import { Header } from "../header";
import ListingFilter from "../listing-filter";
import { ListingFilterDisplay } from "../listing-filter-display";
import { useTelegram } from "../telegram-provider";
import { useCardSelect } from "../use-card-select";
import { CardsSelectList, SelectedCardsList } from "./trade";

export default function MarketCreatePage() {
  const { tgUser } = useTelegram();
  const [filter, setFilter] = useState<Filter>();

  const query = useQuery({
    queryKey: ["user-cards", filter],
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
        user: UserExtended;
        filterOptions: FilterOption[];
        listingFilterOptions: ListingFilterOption[];
      }>;
    },
    placeholderData: keepPreviousData,
  });

  const handleFilterChange = (data: Filter) => {
    setFilter(data);
  };

  if (query.data) {
    return (
      <main className="flex min-h-screen flex-col gap-4 md:container">
        <MarketCreateContent
          user={query.data.user}
          cards={query.data.cards}
          filterOptions={query.data.filterOptions}
          listingFilterOptions={query.data.listingFilterOptions}
          setFilters={handleFilterChange}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-4">
      <Header title="Выставить" />
      <CardsListSkeleton />
    </main>
  );
}

type Steps = "select" | "confirm";

function MarketCreateContent({
  user,
  cards,
  filterOptions,
  listingFilterOptions,
  setFilters,
}: {
  user: UserExtended;
  cards: FullCard[];
  filterOptions: FilterOption[];
  listingFilterOptions: ListingFilterOption[];
  setFilters: (filters: Filter) => void;
}) {
  const [page, setPage] = useState(1);
  const cardsPerPage = 16;
  const router = useRouter();
  const [step, setStep] = useState<Steps>("select");
  const [isLoading, setIsLoading] = useState(false);
  const { selectedCards, resetSelected, onCardSelect } = useCardSelect();
  const [desiredFilters, setDesiredFilters] = useState<ListingFilters>();
  const [minCardPrice, setMinCardPrice] = useState<number>();
  const [minCardCount, setMinCardCount] = useState<number>();
  const [maxCardCount, setMaxCardCount] = useState<number>();

  const skip = (page - 1) * cardsPerPage;
  const pageCards = cards.slice(skip, skip + cardsPerPage);
  const cardsLeft = cards.length - page * cardsPerPage;

  const handleCreateListing = async () => {
    setIsLoading(true);
    if (selectedCards.length === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите хотя бы одну карту.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/market/listings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sellerId: user.id,
            cardIds: selectedCards.map((c) => c.id),
            filters: desiredFilters
              ? {
                  rarityIds: desiredFilters.rarityIds,
                  universeIds: desiredFilters.universeIds,
                  classIds: desiredFilters.classIds,
                  stats: desiredFilters.stats,
                  type: desiredFilters.type,
                  minCardPrice,
                  minCardCount,
                  maxCardCount,
                }
              : {
                  minCardPrice,
                  minCardCount,
                  maxCardCount,
                },
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to create listing");
      }

      toast({
        title: "Успешно",
        description: "Ваши карты выставлены на маркетплейс",
      });

      router.push("/market");
    } catch (e) {
      const message =
        e instanceof Error && e.message !== "Failed to create listing"
          ? e.message
          : "Не удалось создать объявление";
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header
        title={step === "select" ? "Выбрать карты" : "Подтверждение"}
        element={
          step === "select" ? (
            <div className="flex items-center gap-2">
              <CardsFilter
                filterOptions={filterOptions}
                setFilters={setFilters}
              />
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Назад
            </Button>
          )
        }
      />

      <div className="px-2 pb-24">
        {step === "select" ? (
          <CardsSelectList
            pageCards={pageCards}
            selectedCards={selectedCards}
            onClick={onCardSelect}
            pagination={{
              page,
              cardsLeft,
              changePage: setPage,
            }}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <div className="space-y-4 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Что вы ищете взамен?</h3>
                <ListingFilter
                  filterOptions={listingFilterOptions}
                  setFilters={setDesiredFilters}
                  buttonText="Настроить"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="minPrice" className="text-[10px]">
                    Мин. Цена
                  </Label>
                  <Input
                    id="minPrice"
                    type="number"
                    value={minCardPrice}
                    onChange={(e) =>
                      setMinCardPrice(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="minCount" className="text-[10px]">
                    Мин. Карт
                  </Label>
                  <Input
                    id="minCount"
                    type="number"
                    value={minCardCount}
                    onChange={(e) =>
                      setMinCardCount(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxCount" className="text-[10px]">
                    Макс. Карт
                  </Label>
                  <Input
                    id="maxCount"
                    type="number"
                    value={maxCardCount}
                    onChange={(e) =>
                      setMaxCardCount(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <ListingFilterDisplay
                filters={desiredFilters ?? null}
                filterOptions={filterOptions}
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Выбранные карты ({selectedCards.length})
              </h3>
              <SelectedCardsList
                selectedCards={selectedCards}
                onClick={onCardSelect}
              />
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 flex w-full gap-4 border-t bg-background p-4">
        {step === "select" ? (
          <>
            <Button
              variant="destructive"
              className="w-full"
              onClick={resetSelected}
            >
              Сбросить
            </Button>
            <Button
              className="w-full"
              disabled={selectedCards.length === 0}
              onClick={() => setStep("confirm")}
            >
              Продолжить ({selectedCards.length})
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setStep("select")}
            >
              Назад
            </Button>
            <Button
              className="w-full"
              disabled={isLoading}
              onClick={handleCreateListing}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Загрузка...
                </>
              ) : (
                "Выставить"
              )}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
