"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRightLeft,
  ChevronLeft,
  Info,
  Loader2,
  Package,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { showApiError } from "@/lib/api-feedback";
import { getImageProxyUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, FullCard } from "@/db/schema/card";
import { useCardSelect } from "@/hook/use-card-select";
import { useCardsFilterState } from "@/hook/use-cards-filter-state";
import { useFilterOptions } from "@/hook/use-filter-options";
import { marketKeys, useMarketLimits } from "@/hook/use-market";
import { usePaginatedCardsQuery } from "@/hook/use-paginated-cards-query";
import { useTelegramBackButton } from "@/hook/use-telegram-back-button";
import { Badge } from "@/ui/badge";
import { Skeleton } from "@/ui/skeleton";

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

export function restrictOptionsToLocked(
  filterOptions: FilterOption[],
  locked: Partial<Filter>
): FilterOption[] {
  console.log(locked);
  return filterOptions.map((option) => {
    const lockedValues = locked[option.key];
    if (!Array.isArray(lockedValues) || lockedValues?.length === 0) {
      return option;
    }

    const allowedIds = lockedValues as Array<number | string>;
    const lockedItems = option.items.filter((item) =>
      allowedIds.includes(item.id)
    );

    return { ...option, items: lockedItems };
  });
}

export default function MarketOfferPage({ listingId }: { listingId: string }) {
  const { userId } = useTelegram();
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
      <main className="flex h-full flex-col md:container">
        <Header title="Предложение" />
        <div className="flex items-center p-3">
          <Skeleton className="h-7 w-44 rounded-full" />
        </div>
        <div className="flex-1 px-2">
          <Skeleton className="mb-3 h-24 w-full rounded-xl p-3" />
          <ul className="grid grid-cols-4 gap-2">
            {new Array(16).fill(0).map((_, idx) => (
              <li key={idx}>
                <Skeleton className="aspect-[3/4] rounded-md" />
              </li>
            ))}
          </ul>
        </div>
        <div className=" flex w-full gap-4 border-t bg-card px-4 py-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </main>
    );
  }

  if (listingQuery.data && filterData && userId) {
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

    return (
      <main className="flex h-full flex-col md:container">
        <MarketOfferContent
          userId={userId}
          listing={listingQuery.data}
          filterOptions={restrictOptionsToLocked(
            filterData.filterOptions,
            initialFilter
          )}
          initialFilter={initialFilter}
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
}: {
  userId: string;
  listing: MarketListing;
  filterOptions: FilterOption[];
  initialFilter: Filter;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: limits } = useMarketLimits();
  const offerLimit = limits?.offers;
  const limitReached = offerLimit ? !offerLimit.canCreate : false;
  const [step, setStep] = useState<Steps>("select");
  const [isLoading, setIsLoading] = useState(false);
  const { selectedCards, resetSelected, onCardSelect } = useCardSelect();
  const { page, filter, handleChangePage, handleFilterChange } =
    useCardsFilterState(initialFilter);
  const handleCreateOffer = async () => {
    setIsLoading(true);

    if (limitReached && offerLimit) {
      toast.warning(
        `Достигнут лимит активных предложений (${offerLimit.active}/${offerLimit.limit}).`
      );
      setIsLoading(false);
      return;
    }

    if (
      listing.filters?.minCardCount &&
      selectedCards.length < listing.filters.minCardCount
    ) {
      toast.warning(
        `Минимальное количество карт: ${listing.filters.minCardCount}`
      );
      setIsLoading(false);
      return;
    }

    if (
      listing.filters?.maxCardCount &&
      selectedCards.length > listing.filters.maxCardCount
    ) {
      toast.warning(
        `Максимальное количество карт: ${listing.filters.maxCardCount}`
      );
      setIsLoading(false);
      return;
    }

    try {
      await api.post("/api/market/offers", {
        listingId: listing.id,
        cardIds: selectedCards.map((c) => c.id),
      });

      toast.success("Ваше предложение успешно отправлено продавцу");

      queryClient.invalidateQueries({ queryKey: marketKeys.limits });
      router.push("/market");
    } catch (e) {
      showApiError(e, "Не удалось отправить предложение");
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
              initialValues={filter}
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Назад
            </Button>
          )
        }
      />

      <StepIndicator
        currentStep={step === "select" ? 1 : 2}
        steps={["Выбор карт", "Подтверждение"]}
        className="p-3"
      />

      {limitReached && offerLimit && (
        <div className="mx-3 mb-1 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="text-[11px] text-amber-600">
            <p className="font-semibold">
              Достигнут лимит активных предложений ({offerLimit.active}/
              {offerLimit.limit})
            </p>
            <p className="text-amber-600/80">
              {limits?.isPremium
                ? "Дождитесь ответа или отмените одно из предложений."
                : "Оформите премиум, чтобы отправлять больше предложений."}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {step === "select" && listing.filters && (
          <div className="mb-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
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
                      sizes="300px"
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

      <div className="flex w-full gap-4 border-t bg-card px-4 py-2">
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
              disabled={selectedCards.length === 0 || limitReached}
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
              disabled={isLoading || limitReached}
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
  userId: string;
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
  if (!query.data) return <CardsListSkeleton className="px-0" />;
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
