"use client";

import { useState } from "react";
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

import { getImageProxyUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Card, FullCard } from "@/db/schema/card";
import { UserExtended } from "@/db/schema/user";
import { Badge } from "@/ui/badge";

import CardsFilter from "../cards-filter";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption, ListingFilters } from "../get-filter-options";
import { Header } from "../header";
import { ListingFilterDisplay } from "../listing-filter-display";
import { StepIndicator } from "../step-indicator";
import { useTelegram } from "../telegram-provider";
import { useApi } from "../use-api";
import { useCardSelect } from "../use-card-select";
import { useFilterOptions } from "../use-filter-options";
import { useTelegramBackButton } from "../use-telegram-back-button";
import { CardsSelectList, SelectedCardsList } from "./trade";

type MarketListing = {
  id: number;
  sellerId: string;
  filters: ListingFilters | null;
  cards: Card[];
};

export default function MarketOfferPage({ listingId }: { listingId: string }) {
  const { tgUser } = useTelegram();
  const api = useApi();
  const [filter, setFilter] = useState<Filter>();
  const router = useRouter();
  useTelegramBackButton(`/market/${listingId}`);
  const { data: filterData } = useFilterOptions();

  const listingQuery = useQuery({
    queryKey: ["market-listing", listingId],
    queryFn: async () => {
      const { listing } = await api<{ listing: MarketListing | null }>(
        `/api/market/listings/${listingId}`
      );
      return listing;
    },
  });

  const cardsQuery = useQuery({
    queryKey: ["user-cards-market-offer", tgUser?.id, listingId, filter],
    enabled: !!tgUser && !!listingQuery.data,
    queryFn: async () => {
      if (!tgUser || !listingQuery.data) return;
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

      const finalFilter = filter ?? initialFilter;

      const userCards = await api<{ cards: FullCard[]; user: UserExtended }>(
        `/api/user/cards?id=${tgUser.id}`,
        { method: "POST", body: finalFilter }
      );

      return {
        cards: userCards.cards,
        user: userCards.user,
        initialFilter: initialFilter,
      };
    },
  });

  if (listingQuery.isLoading || cardsQuery.isLoading || !filterData) {
    return (
      <main className="flex min-h-screen flex-col gap-4">
        <Header title="Загрузка..." />
        <CardsListSkeleton />
      </main>
    );
  }

  if (listingQuery.data && cardsQuery.data && filterData) {
    const lockedFilters: Partial<Filter> = {
      rarityIds: listingQuery.data.filters?.rarityIds?.length
        ? listingQuery.data.filters.rarityIds
        : undefined,
      classIds: listingQuery.data.filters?.classIds?.length
        ? listingQuery.data.filters.classIds
        : undefined,
      universeIds: listingQuery.data.filters?.universeIds?.length
        ? listingQuery.data.filters.universeIds
        : undefined,
      stats: listingQuery.data.filters?.stats?.length
        ? listingQuery.data.filters.stats
        : undefined,
      droppable: listingQuery.data.filters?.type?.length
        ? listingQuery.data.filters.type
        : undefined,
      minPrice: listingQuery.data.filters?.minCardPrice,
    };

    return (
      <main className="flex h-full flex-col">
        <MarketOfferContent
          listing={listingQuery.data}
          user={cardsQuery.data.user}
          cards={cardsQuery.data.cards}
          filterOptions={filterData.filterOptions}
          setFilters={setFilter}
          initialFilter={cardsQuery.data.initialFilter}
          filter={filter}
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
  listing,
  user,
  cards,
  filterOptions,
  setFilters,
  initialFilter,
  filter,
  lockedFilters,
}: {
  listing: MarketListing;
  user: UserExtended;
  cards: FullCard[];
  filterOptions: FilterOption[];
  setFilters: (filters: Filter) => void;
  initialFilter: Filter;
  filter?: Filter;
  lockedFilters: Partial<Filter>;
}) {
  const api = useApi();
  const [page, setPage] = useState(1);
  const cardsPerPage = 16;
  const router = useRouter();
  const [step, setStep] = useState<Steps>("select");
  const [isLoading, setIsLoading] = useState(false);
  const { selectedCards, resetSelected, onCardSelect } = useCardSelect();

  const skip = (page - 1) * cardsPerPage;
  const pageCards = cards.slice(skip, skip + cardsPerPage);
  const cardsLeft = cards.length - page * cardsPerPage;

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
      await api("/api/market/offers", {
        method: "POST",
        body: {
          listingId: listing.id,
          cardIds: selectedCards.map((c) => c.id),
        },
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
              setFilters={setFilters}
              initialValues={filter ?? initialFilter}
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
