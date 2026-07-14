"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2, Package } from "lucide-react";

import { api } from "@/lib/api";
import { MAX_LISTING_CARDS } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { FullCard } from "@/db/schema/card";
import { useCardSelect } from "@/hook/use-card-select";
import { useCardsFilterState } from "@/hook/use-cards-filter-state";
import { useListingFilterOptions } from "@/hook/use-filter-options";
import { marketKeys } from "@/hook/use-market";
import { usePaginatedCardsQuery } from "@/hook/use-paginated-cards-query";
import { useTelegramBackButton } from "@/hook/use-telegram-back-button";
import { Badge } from "@/ui/badge";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Skeleton } from "@/ui/skeleton";

import CardsFilter from "../cards-filter";
import { CardsSelectListServer } from "../cards-list";
import {
  Filter,
  FilterOption,
  ListingFilterOption,
  ListingFilters,
} from "../get-filter-options";
import { Header } from "../header";
import ListingFilter from "../listing-filter";
import { ListingFilterDisplay } from "../listing-filter-display";
import { StepIndicator } from "../step-indicator";
import { useTelegram } from "../telegram-provider";
import { fetchProfileCards, ProfileCardsData } from "./profile";
import { SelectedCardsList } from "./trade";

export default function MarketCreatePage() {
  const { tgUser } = useTelegram();
  useTelegramBackButton("/market");
  const { data: optionsData } = useListingFilterOptions();

  if (optionsData && tgUser) {
    return (
      <main className="flex min-h-screen flex-col gap-4 md:container">
        <MarketCreateContent
          userId={tgUser.id}
          filterOptions={optionsData.filterOptions}
          listingFilterOptions={optionsData.listingFilterOptions}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <Header
        title="Новое объявление"
        element={<Skeleton className="h-9 w-9 rounded-md" />}
      />
      <div className="flex items-center justify-between px-3 pb-1">
        <Skeleton className="h-7 w-44 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <div className="px-2 pb-24">
        <ul className="grid grid-cols-4 gap-2">
          {new Array(16).fill(0).map((_, idx) => (
            <li key={idx}>
              <Skeleton className="aspect-[3/4] rounded-md" />
            </li>
          ))}
        </ul>
      </div>
      <div className="fixed bottom-0 left-0 flex w-full gap-3 border-t bg-card p-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </main>
  );
}

type Steps = "select" | "confirm";

function MarketCreateContent({
  userId,
  filterOptions,
  listingFilterOptions,
}: {
  userId: number;
  filterOptions: FilterOption[];
  listingFilterOptions: ListingFilterOption[];
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [step, setStep] = useState<Steps>("select");
  const [isLoading, setIsLoading] = useState(false);
  const { selectedCards, resetSelected, onCardSelect } = useCardSelect();
  const { page, filter, handleChangePage, handleFilterChange } =
    useCardsFilterState();
  const [desiredFilters, setDesiredFilters] = useState<ListingFilters>();

  const [minCardPrice, setMinCardPrice] = useState<number>();
  const [minCardCount, setMinCardCount] = useState<number>();
  const [maxCardCount, setMaxCardCount] = useState<number | undefined>(
    MAX_LISTING_CARDS
  );

  const handleCardSelect = (card: FullCard) => () => {
    const isSelected = selectedCards.some((c) => c.id === card.id);
    if (!isSelected && selectedCards.length >= MAX_LISTING_CARDS) {
      toast({
        title: "Лимит карт",
        description: `В одном объявлении можно выставить не более ${MAX_LISTING_CARDS} карт.`,
        variant: "destructive",
      });
      return;
    }
    onCardSelect(card)();
  };

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
      await api.post("/api/market/listings", {
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
      });

      toast({
        title: "Успешно",
        description: "Ваши карты выставлены на маркетплейс",
      });

      queryClient.invalidateQueries({ queryKey: marketKeys.listings });
      router.push("/market");
    } catch (e) {
      toast({
        title: "Ошибка",
        description:
          e instanceof Error ? e.message : "Не удалось создать объявление",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header
        title="Новое объявление"
        element={
          step === "select" ? (
            <div className="flex items-center gap-2">
              <CardsFilter
                filterOptions={filterOptions}
                setFilters={handleFilterChange}
              />
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Назад
            </Button>
          )
        }
      />

      <div className="flex items-center justify-between px-3 pb-1">
        <StepIndicator
          currentStep={step === "select" ? 1 : 2}
          steps={["Выбор карт", "Настройка"]}
        />
        {step === "select" && (
          <Badge variant="secondary" className="text-[10px]">
            {selectedCards.length}/{MAX_LISTING_CARDS}
          </Badge>
        )}
      </div>

      <div className="px-2 pb-24">
        {step === "select" ? (
          <MarketCardsList
            page={page}
            filter={filter}
            userId={userId}
            selectedCards={selectedCards}
            onCardSelect={onCardSelect}
            handleChangePage={handleChangePage}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="space-y-4 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Требования к обмену</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Укажите, какие карты вы хотите получить
                  </p>
                </div>
                <ListingFilter
                  filterOptions={listingFilterOptions}
                  setFilters={setDesiredFilters}
                  buttonText="Настроить"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="minPrice" className="text-[11px]">
                    Мин. цена
                  </Label>
                  <Input
                    id="minPrice"
                    type="number"
                    placeholder="0"
                    value={minCardPrice}
                    onChange={(e) =>
                      setMinCardPrice(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minCount" className="text-[11px]">
                    Мин. карт
                  </Label>
                  <Input
                    id="minCount"
                    type="number"
                    placeholder="0"
                    value={minCardCount}
                    onChange={(e) =>
                      setMinCardCount(
                        e.target.value ? Number(e.target.value) : undefined
                      )
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="maxCount" className="text-[11px]">
                    Макс. карт
                  </Label>
                  <Input
                    id="maxCount"
                    type="number"
                    min={1}
                    max={MAX_LISTING_CARDS}
                    placeholder={String(MAX_LISTING_CARDS)}
                    value={maxCardCount ?? ""}
                    onChange={(e) => {
                      if (!e.target.value) {
                        setMaxCardCount(undefined);
                        return;
                      }
                      const value = Number(e.target.value);
                      setMaxCardCount(
                        Math.min(Math.max(1, value), MAX_LISTING_CARDS)
                      );
                    }}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <ListingFilterDisplay
                filters={desiredFilters ?? null}
                filterOptions={filterOptions}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Выбранные карты</h3>
                <Badge variant="secondary" className="text-[10px]">
                  <Package className="mr-1 h-3 w-3" />
                  {selectedCards.length} карт
                </Badge>
              </div>
              <SelectedCardsList
                selectedCards={selectedCards}
                onClick={handleCardSelect}
              />
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 flex w-full gap-3 border-t bg-card p-4">
        {step === "select" ? (
          <>
            <Button
              variant="outline"
              className="w-full"
              onClick={resetSelected}
              disabled={selectedCards.length === 0}
            >
              Сбросить
            </Button>
            <Button
              className="w-full"
              disabled={selectedCards.length === 0}
              onClick={() => setStep("confirm")}
            >
              Далее ({selectedCards.length})
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
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

export function MarketCardsList({
  userId,
  filter,
  page,
  selectedCards,
  onCardSelect,
  handleChangePage,
}: {
  page: number;
  selectedCards: FullCard[];
  filter: Filter;
  userId: number;
  handleChangePage: (page: number) => void;
  onCardSelect: (card: FullCard) => () => void;
}) {
  const query = usePaginatedCardsQuery<ProfileCardsData>({
    queryKey: ["profile-cards", userId],
    filter,
    page,
    fetchFn: fetchProfileCards,
  });
  if (!query.data) return <h1>hi</h1>;
  return (
    <CardsSelectListServer
      cards={query.data.cards}
      selectedCards={selectedCards}
      onClick={onCardSelect}
      page={page}
      total={query.data.total}
      onPageChange={handleChangePage}
    />
  );
}
