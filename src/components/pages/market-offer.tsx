"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  ChevronLeft,
  Info,
  Loader2,
  Package,
} from "lucide-react";

import { api } from "@/lib/api";
import { getImageProxyUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Card, FullCard } from "@/db/schema/card";
import { useCardSelect } from "@/hook/use-card-select";
import { useCardsFilterState } from "@/hook/use-cards-filter-state";
import { useFilterOptions } from "@/hook/use-filter-options";
import { usePaginatedCardsQuery } from "@/hook/use-paginated-cards-query";
import { useTelegramBackButton } from "@/hook/use-telegram-back-button";
import { Badge } from "@/ui/badge";

import CardsFilter from "../cards-filter";
import { CardsSelectListServer } from "../cards-list";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption, ListingFilters } from "../get-filter-options";
import { Header } from "../header";
import { ListingFilterDisplay } from "../listing-filter-display";
import { StepIndicator } from "../step-indicator";
import { useTelegram } from "../telegram-provider";
import { fetchTradeCards, SelectedCardsList, TradeCardsData } from "./trade";

type MarketListing = {
  id: number;
  sellerId: string;
  filters: ListingFilters | null;
  cards: Card[];
};

export default function MarketOfferPage({ listingId }: { listingId: string }) {
  const { tgUser } = useTelegram();
  const router = useRouter();
  useTelegramBackButton(`/market/${listingId}`);
  const { data: filterData } = useFilterOptions();

  const listingQuery = useQuery({
    queryKey: ["market-listing", listingId],
    queryFn: async () => {
      const { data } = await api.get<{ listing: MarketListing | null }>(
        `/api/market/listings/${listingId}`
      );
      return data.listing;
    },
  });

  if (listingQuery.isLoading || !filterData) {
    return (
      <main className="flex min-h-screen flex-col gap-4">
        <Header title="Загрузка..." />
        <CardsListSkeleton />
      </main>
    );
  }

  if (listingQuery.data && filterData && tgUser) {
    const listing = listingQuery.data;
    const initialFilter: Filter = {
      authorIds: [],
      classIds: listing.filters?.classIds ?? [],
      universeIds: listing.filters?.universeIds ?? [],
      rarityIds: listing.filters?.rarityIds ?? [],
      stats: listing.filters?.stats ?? [],
      droppable: listing.filters?.type ?? [],
      techniques: [],
      sort: "power-desc",
      minPrice: listing.filters?.minCardPrice,
    };
    const lockedFilters: Partial<Filter> = {
      rarityIds: listing.filters?.rarityIds?.length
        ? listing.filters.rarityIds
        : undefined,
      classIds: listing.filters?.classIds?.length
        ? listing.filters.classIds
        : undefined,
      universeIds: listing.filters?.universeIds?.length
        ? listing.filters.universeIds
        : undefined,
      stats: listing.filters?.stats?.length ? listing.filters.stats : undefined,
      droppable: listing.filters?.type?.length
        ? listing.filters.type
        : undefined,
      minPrice: listing.filters?.minCardPrice,
    };

    return (
      <main className="flex h-full flex-col">
        <MarketOfferContent
          userId={tgUser.id}
          listing={listingQuery.data}
          filterOptions={filterData.filterOptions}
          initialFilter={initialFilter}
          lockedFilters={lockedFilters}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground">
        Не удалось загрузить данные
      </p>
      <Button onClick={() => router.back()}>Назад</Button>
    </main>
  );
}

type Steps = "select" | "confirm";

function MarketOfferContent({
  userId,
  listing,
  filterOptions,
  initialFilter,
  lockedFilters,
}: {
  userId: number;
  listing: MarketListing;
  filterOptions: FilterOption[];
  initialFilter: Filter;
  lockedFilters: Partial<Filter>;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Steps>("select");
  const [isLoading, setIsLoading] = useState(false);
  const { selectedCards, resetSelected, onCardSelect } = useCardSelect();
  const { page, filter, handleChangePage, handleFilterChange } =
    useCardsFilterState(initialFilter);
  const handleCreateOffer = async () => {
    setIsLoading(true);

    if (
      listing.filters?.minCardCount &&
      selectedCards.length < listing.filters.minCardCount
    ) {
      toast({
        title: "Ошибка",
        description: `Минимальное количество карт: ${listing.filters.minCardCount}`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    if (
      listing.filters?.maxCardCount &&
      selectedCards.length > listing.filters.maxCardCount
    ) {
      toast({
        title: "Ошибка",
        description: `Максимальное количество карт: ${listing.filters.maxCardCount}`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      await api.post("/api/market/offers", {
        listingId: listing.id,
        cardIds: selectedCards.map((c) => c.id),
      });

      toast({
        title: "Предложение отправлено",
        description: "Ваше предложение успешно отправлено продавцу",
      });

      router.push("/market");
    } catch (e) {
      toast({
        title: "Ошибка",
        description:
          e instanceof Error ? e.message : "Не удалось отправить предложение",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const matchesFilters = (card: FullCard) => {
    if (!listing.filters) return true;
    const f = listing.filters;

    if (
      f.rarityIds &&
      f.rarityIds.length > 0 &&
      !f.rarityIds.includes(card.rarityId)
    )
      return false;
    if (
      f.universeIds &&
      f.universeIds.length > 0 &&
      !f.universeIds.includes(card.universeId)
    )
      return false;
    if (
      f.classIds &&
      f.classIds.length > 0 &&
      !f.classIds.includes(card.classId)
    )
      return false;

    if (f.stats && f.stats.length > 0 && !f.stats.includes(card.stats))
      return false;

    if (f.minCardPrice && card.price < f.minCardPrice) return false;

    if (f.type && f.type.length > 0) {
      const matchesType = f.type.some((t) => {
        if (t === "limited") return !card.droppable;
        if (t === "basic") return card.droppable;
        if (t === "upgradable") return card.upgradeable;
        if (t === "upgrade") return card.upgrade;
        return false;
      });
      if (!matchesType) return false;
    }

    return true;
  };

  const allSelectedMatch = selectedCards.every(matchesFilters);

  return (
    <>
      <Header
        title="Предложение"
        element={
          step === "select" ? (
            <CardsFilter
              filterOptions={filterOptions}
              setFilters={handleFilterChange}
              lockedFilters={lockedFilters}
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Назад
            </Button>
          )
        }
      />

      <div className="px-3 pb-2 pt-3">
        <StepIndicator
          currentStep={step === "select" ? 1 : 2}
          steps={["Выбор карт", "Подтверждение"]}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {step === "select" && listing.filters && (
          <div className="mb-3 mt-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-semibold text-blue-500">
                Требования продавца
              </span>
            </div>
            <ListingFilterDisplay
              filters={listing.filters}
              filterOptions={filterOptions}
            />
          </div>
        )}

        {step === "select" ? (
          <>
            {!allSelectedMatch && selectedCards.length > 0 && (
              <div className="mb-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                <p className="text-[11px] font-medium text-destructive">
                  Некоторые выбранные карты не соответствуют требованиям
                  продавца
                </p>
              </div>
            )}

            <MarketCardsList
              page={page}
              filter={filter}
              userId={userId}
              secondId={listing.sellerId}
              selectedCards={selectedCards}
              onCardSelect={onCardSelect}
              handleChangePage={handleChangePage}
            />
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-3.5">
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Карты продавца ({listing.cards.length})
              </h4>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {listing.cards.map((c) => (
                  <div
                    key={c.id}
                    className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md border shadow-sm"
                  >
                    <Image
                      src={getImageProxyUrl(c.image)}
                      alt={c.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold">Ваши карты</h4>
                <Badge variant="secondary" className="text-[10px]">
                  <Package className="mr-1 h-3 w-3" />
                  {selectedCards.length} карт
                </Badge>
              </div>
              <SelectedCardsList
                selectedCards={selectedCards}
                onClick={onCardSelect}
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t bg-card p-4">
        <div className="flex gap-3">
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
                onClick={handleCreateOffer}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  "Отправить"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function MarketCardsList({
  userId,
  secondId,
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
  secondId: string;
  handleChangePage: (page: number) => void;
  onCardSelect: (card: FullCard) => () => void;
}) {
  const fetchFn = useCallback(
    (filter: Filter, page: number) => fetchTradeCards(filter, page, secondId),
    [secondId]
  );
  const query = usePaginatedCardsQuery<TradeCardsData>({
    queryKey: ["trade-cards", userId],
    filter,
    page,
    fetchFn,
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
