"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Loader2,
  MessageSquare,
  Package,
  Plus,
  Send,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import {
  LISTINGS_PER_PAGE,
  listingStatusMap,
  offerStatusMap,
} from "@/lib/constants";
import { getImageProxyUrl, timeAgo } from "@/lib/utils";

import { useClientPagination } from "@/hook/use-client-pagination";
import {
  marketKeys,
  MarketListingSummary,
  useMarketListings,
  UserMarketOffer,
  useUserMarketListings,
  useUserMarketOffers,
} from "@/hook/use-market";
import { Badge } from "@/ui/badge";
import { Button, buttonVariants } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";

import { FilterOption } from "../get-filter-options";
import { Header } from "../header";
import { ListingFilterDisplay } from "../listing-filter-display";
import CardsPagination from "../pagination";
import { useTelegram } from "../telegram-provider";
import { UserAvatar } from "../user-avatar";
import { UserLink } from "../user-link";

export default function MarketPage({
  initialListings,
  filterOptions,
}: {
  initialListings?: MarketListingSummary[];
  filterOptions: FilterOption[];
}) {
  const { userId } = useTelegram();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("all");

  const { data: listings = [], isLoading: listingsLoading } =
    useMarketListings(initialListings);
  const { data: userOffers = [], isLoading: userOffersLoading } =
    useUserMarketOffers(userId);
  const { data: inactiveListings = [], isLoading: inactiveLoading } =
    useUserMarketListings(userId, {
      status: "inactive",
      enabled: activeTab === "my",
    });

  const myActiveListings = userId
    ? listings.filter((l) => l.sellerId === userId)
    : [];
  const myListings = [...myActiveListings, ...inactiveListings];

  const handleCancelOffer = async (offerId: number) => {
    if (!userId) return;

    try {
      await api.post("/api/market/offers/cancel", {
        offerId,
      });

      toast.success("Предложение отменено");

      queryClient.invalidateQueries({
        queryKey: marketKeys.userOffers(userId),
      });
      queryClient.invalidateQueries({ queryKey: marketKeys.listings });
    } catch {
      toast.error("Не удалось отменить предложение");
    }
  };

  return (
    <main className="flex h-full flex-col">
      <Header
        title="Маркетплейс"
        element={
          <Link
            href="/market/create"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            <Plus className="mr-1 h-4 w-4" /> Выставить
          </Link>
        }
      />

      <Tabs
        defaultValue="all"
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="px-2 pt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="gap-1.5">
              <Store className="h-3.5 w-3.5" />
              Все
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Мои
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Офферы
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 md:container">
          <TabsContent value="all" className="mt-0">
            <ListingsList
              listings={listings}
              isLoading={listingsLoading}
              showStatus={false}
              currentUserId={userId}
              filterOptions={filterOptions}
            />
          </TabsContent>
          <TabsContent value="my" className="mt-0">
            <ListingsList
              listings={myListings}
              isLoading={inactiveLoading && myListings.length === 0}
              showStatus={true}
              currentUserId={userId}
              filterOptions={filterOptions}
            />
          </TabsContent>
          <TabsContent value="offers" className="mt-0">
            <OffersList
              offers={userOffers}
              isLoading={userOffersLoading}
              onCancel={handleCancelOffer}
            />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}

function ListingCard({
  listing,
  showStatus,
  isOwn,
  filterOptions,
}: {
  listing: MarketListingSummary;
  showStatus: boolean;
  isOwn: boolean;
  filterOptions: FilterOption[];
}) {
  const statusInfo =
    listingStatusMap[listing.status] ?? listingStatusMap.active;
  const hasFilters =
    listing.filters &&
    (listing.filters.rarityIds?.length ||
      listing.filters.universeIds?.length ||
      listing.filters.classIds?.length ||
      listing.filters.type?.length ||
      listing.filters.stats?.length ||
      listing.filters.minCardPrice ||
      listing.filters.minCardCount ||
      listing.filters.maxCardCount);

  return (
    <Link
      href={`/market/${listing.id}`}
      className="block rounded-xl border border-border bg-card shadow-sm transition-colors hover:border-primary/30 hover:bg-card/80"
    >
      <div className="p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar
              name={listing.seller.name}
              photoUrl={listing.seller.photoUrl}
              size={28}
            />
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold leading-tight">
                  {listing.seller.name}
                </span>
                {isOwn && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1 py-0 text-[9px] text-muted-foreground"
                  >
                    Вы
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {timeAgo(listing.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showStatus && (
              <Badge variant={statusInfo.variant} className="text-[10px]">
                {statusInfo.label}
              </Badge>
            )}
            {listing.pendingOfferCount > 0 && (
              <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5">
                <MessageSquare className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-semibold text-amber-600">
                  {listing.pendingOfferCount}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="no-scrollbar flex gap-1 overflow-x-auto pb-1">
          {listing.cards.map((card) => (
            <div
              key={card.id}
              className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-sm border shadow-sm"
            >
              <Image
                src={getImageProxyUrl(card.image)}
                alt={card.name}
                fill
                sizes="300px"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        <div className="mt-2 border-t pt-2">
          <ListingFilterDisplay
            inline
            filters={hasFilters ? listing.filters : null}
            filterOptions={filterOptions}
          />
        </div>
      </div>
    </Link>
  );
}

function ListingsList({
  listings,
  isLoading,
  showStatus,
  currentUserId,
  filterOptions,
}: {
  listings: MarketListingSummary[];
  isLoading: boolean;
  showStatus: boolean;
  currentUserId?: string;
  filterOptions: FilterOption[];
}) {
  const {
    page,
    setPage,
    pageItems: pageListings,
    cardsLeft,
  } = useClientPagination(listings, LISTINGS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border p-3">
            <div className="mb-3 flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-20 w-[60px] rounded-lg" />
              ))}
            </div>
            <div className="mt-2.5 flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="rounded-full bg-muted p-4">
          <Package className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Нет объявлений
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Будьте первым кто выставит карты на обмен
          </p>
        </div>
        <Link
          href="/market/create"
          className={buttonVariants({ variant: "default", size: "sm" })}
        >
          <Plus className="mr-1 h-4 w-4" /> Выставить карты
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {pageListings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            showStatus={showStatus}
            isOwn={listing.sellerId === currentUserId}
            filterOptions={filterOptions}
          />
        ))}
      </div>

      <div className="mt-4">
        <CardsPagination
          page={page}
          cardsLeft={cardsLeft}
          handleChangePage={setPage}
        />
      </div>
    </>
  );
}

function OffersList({
  offers,
  isLoading,
  onCancel,
}: {
  offers: UserMarketOffer[];
  isLoading: boolean;
  onCancel: (offerId: number) => Promise<void>;
}) {
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const {
    page,
    setPage,
    pageItems: pageOffers,
    cardsLeft,
  } = useClientPagination(offers, LISTINGS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="mb-2 h-3 w-20" />
            <div className="flex gap-1.5">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-16 w-12 rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="rounded-full bg-muted p-4">
          <Send className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Нет предложений
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Ваши предложения на обмен появятся здесь
          </p>
        </div>
        <Link
          href="/market"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Перейти к объявлениям
        </Link>
      </div>
    );
  }

  const handleCancel = async (offerId: number) => {
    setCancellingId(offerId);
    await onCancel(offerId);
    setCancellingId(null);
  };

  return (
    <>
      <div className="space-y-3">
        {pageOffers.map((offer) => {
          const statusInfo =
            offerStatusMap[offer.status] ?? offerStatusMap.pending;
          const isPending = offer.status === "pending";
          const isAccepted = offer.status === "accepted";

          return (
            <div
              key={offer.id}
              className={`rounded-xl border bg-card shadow-sm transition-opacity ${
                !isPending && !isAccepted ? "opacity-60" : ""
              } ${isAccepted ? "border-green-500/30" : "border-border"}`}
            >
              <div className="p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {offer.listing ? (
                      <UserLink
                        userId={offer.listing.sellerId}
                        name={offer.listing.seller.name}
                        photoUrl={offer.listing.seller.photoUrl}
                        size={32}
                      />
                    ) : (
                      <UserAvatar name="?" size={32} />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold leading-tight">
                        {offer.listing?.seller.name ?? "Удалено"}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {timeAgo(offer.createdAt)}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusInfo.className}>
                    {statusInfo.label}
                  </Badge>
                </div>

                {offer.listing && (
                  <div className="mb-2.5">
                    <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                      Карты продавца
                    </span>
                    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                      {offer.listing.cards.map((card) => (
                        <div
                          key={card.id}
                          className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-sm border shadow-sm"
                        >
                          <Image
                            src={getImageProxyUrl(card.image)}
                            alt={card.name}
                            fill
                            sizes="300px"
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-2.5">
                  <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Ваши карты
                  </span>
                  <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                    {offer.cards.map((card) => (
                      <div
                        key={card.id}
                        className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md border border-primary/30 shadow-sm"
                      >
                        <Image
                          src={getImageProxyUrl(card.image)}
                          alt={card.name}
                          fill
                          sizes="300px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isPending && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 flex-1 text-xs"
                      disabled={cancellingId === offer.id}
                      onClick={() => handleCancel(offer.id)}
                    >
                      {cancellingId === offer.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Отменить"
                      )}
                    </Button>
                  )}
                  {offer.listing && (
                    <Link
                      href={`/market/${offer.listingId}`}
                      className={buttonVariants({
                        size: "sm",
                        variant: isPending ? "outline" : "default",
                        className: "h-8 flex-1 text-xs",
                      })}
                    >
                      Посмотреть
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <CardsPagination
          page={page}
          cardsLeft={cardsLeft}
          handleChangePage={setPage}
        />
      </div>
    </>
  );
}
