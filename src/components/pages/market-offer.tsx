"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, Info } from "lucide-react";

import { getProxyUrl } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { FullCard } from "@/db/schema/card";
import { MarketFilters } from "@/db/schema/market";
import { UserExtended } from "@/db/schema/user";
import { Badge } from "@/ui/badge";

import CardsFilter from "../cards-filter";
import { CardsListSkeleton } from "../cards-list-skeleton";
import { Filter, FilterOption } from "../get-filte-options";
import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { useCardSelect } from "../use-card-select";
import { CardsSelectList, SelectedCardsList } from "./trade";

type MarketListing = {
  id: number;
  sellerId: string;
  filters: MarketFilters | null;
  cards: FullCard[];
};

export default function MarketOfferPage({ listingId }: { listingId: string }) {
  const { tgUser } = useTelegram();
  const [filter, setFilter] = useState<Filter>();
  const router = useRouter();

  const listingQuery = useQuery({
    queryKey: ["market-listing", listingId],
    queryFn: async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/market/listings/${listingId}`
      );
      return (await response.json()).listing as Promise<MarketListing>;
    },
  });

  const cardsQuery = useQuery({
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
      }>;
    },
    placeholderData: keepPreviousData,
  });

  if (listingQuery.isLoading || cardsQuery.isLoading) {
    return (
      <main className="flex min-h-screen flex-col gap-4">
        <Header title="Загрузка..." />
        <CardsListSkeleton />
      </main>
    );
  }

  if (listingQuery.data && cardsQuery.data) {
    return (
      <main className="fixed inset-0 flex flex-col md:container">
        <MarketOfferContent
          listing={listingQuery.data}
          user={cardsQuery.data.user}
          cards={cardsQuery.data.cards}
          filterOptions={cardsQuery.data.filterOptions}
          setFilters={setFilter}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <p>Не удалось загрузить данные</p>
      <Button onClick={() => router.back()} className="mt-4">
        Назад
      </Button>
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
}: {
  listing: MarketListing;
  user: UserExtended;
  cards: FullCard[];
  filterOptions: FilterOption[];
  setFilters: (filters: Filter) => void;
}) {
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

    // Basic validation based on seller filters
    if (
      listing.filters?.minCardCount &&
      selectedCards.length < listing.filters.minCardCount
    ) {
      toast({
        title: "Ошибка",
        description: `Минимальное количество карт для этого предложения: ${listing.filters.minCardCount}`,
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
        description: `Максимальное количество карт для этого предложения: ${listing.filters.maxCardCount}`,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/market/offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            listingId: listing.id,
            buyerId: user.id,
            cardIds: selectedCards.map((c) => c.id),
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create offer");

      toast({
        title: "Предложение отправлено",
        description: "Ваше предложение успешно отправлено продавцу",
      });

      router.push("/market");
    } catch (e) {
      toast({
        title: "Ошибка",
        description: "Не удалось отправить предложение",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to check if a card matches listing filters
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
    // ... add more if needed

    return true;
  };

  const allSelectedMatch = selectedCards.every(matchesFilters);

  return (
    <>
      <Header
        title={step === "select" ? "Ваше предложение" : "Подтверждение"}
        element={
          step === "select" ? (
            <CardsFilter
              filterOptions={filterOptions}
              setFilters={setFilters}
            />
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Назад
            </Button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto px-2 pb-6">
        {step === "select" && listing.filters && (
          <div className="mb-4 mt-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-semibold text-blue-500">
                Требования продавца:
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {listing.filters.rarityIds &&
                listing.filters.rarityIds.length > 0 && (
                  <Badge
                    variant="outline"
                    className="border-blue-500/30 bg-background text-[10px]"
                  >
                    Спец. редкости
                  </Badge>
                )}
              {listing.filters.universeIds &&
                listing.filters.universeIds.length > 0 && (
                  <Badge
                    variant="outline"
                    className="border-blue-500/30 bg-background text-[10px]"
                  >
                    Спец. вселенные
                  </Badge>
                )}
              {listing.filters.minCardPrice && (
                <Badge
                  variant="outline"
                  className="border-blue-500/30 bg-background text-[10px]"
                >
                  Цена {listing.filters.minCardPrice}+
                </Badge>
              )}
              {listing.filters.minCardCount && (
                <Badge
                  variant="outline"
                  className="border-blue-500/30 bg-background text-[10px]"
                >
                  Мин. карт: {listing.filters.minCardCount}
                </Badge>
              )}
            </div>
          </div>
        )}

        {step === "select" ? (
          <>
            {!allSelectedMatch && selectedCards.length > 0 && (
              <p className="mb-2 text-[10px] font-medium text-destructive">
                ⚠️ Некоторые выбранные карты не соответствуют фильтрам продавца
              </p>
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
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="mb-2 text-xs font-semibold">Вы предлагаете за:</h4>
              <div className="flex -space-x-2 overflow-hidden">
                {listing.cards.map((c) => (
                  <div
                    key={c.id}
                    className="relative h-12 w-9 overflow-hidden rounded border"
                  >
                    <Image
                      src={getProxyUrl(c.image)}
                      alt={c.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold">Ваши карты:</h4>
              <SelectedCardsList
                selectedCards={selectedCards}
                onClick={onCardSelect}
              />
            </div>
          </div>
        )}
      </div>

      <div className="border-t bg-background p-4">
        <div className="flex gap-4">
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
                onClick={handleCreateOffer}
              >
                Подтвердить
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
