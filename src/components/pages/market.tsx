"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightLeft,
  Clock,
  Loader2,
  MessageSquare,
  Package,
  Plus,
  Send,
  Store,
} from "lucide-react";

import { listingStatusMap, offerStatusMap } from "@/lib/constants";
import { getImageProxyUrl } from "@/lib/utils";

import { Card } from "@/db/schema/card";
import { User } from "@/db/schema/user";
import { Badge } from "@/ui/badge";
import { Button, buttonVariants } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { toast } from "@/ui/use-toast";

import { Header } from "../header";
import CardsPagination from "../pagination";
import { useTelegram } from "../telegram-provider";
import { UserAvatar } from "../user-avatar";
import { UserLink } from "../user-link";

type ListingFilters = {
  classIds?: number[];
  rarityIds?: number[];
  universeIds?: number[];
  type?: string[];
  stats?: string[];
  minCardPrice?: number;
  minCardCount?: number;
  maxCardCount?: number;
};

type MarketListing = {
  id: number;
  sellerId: string;
  status: string;
  createdAt: Date;
  filters: ListingFilters | null;
  seller: User;
  cards: Card[];
  offerCount: number;
  pendingOfferCount: number;
};

type UserOffer = {
  id: number;
  listingId: number;
  buyerId: string;
  status: string;
  createdAt: Date;
  cards: Card[];
  listing: {
    id: number;
    sellerId: string;
    status: string;
    seller: User;
    cards: Card[];
  } | null;
};

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "только что";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн. назад`;
  return new Date(date).toLocaleDateString("ru-RU");
}

export default function MarketPage() {
  const { tgUser, initDataRaw } = useTelegram();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [userListings, setUserListings] = useState<MarketListing[]>([]);
  const [userOffers, setUserOffers] = useState<UserOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/market/listings`
        );
        const data = await res.json();
        setListings(data.listings);

        if (tgUser) {
          const [userRes, offersRes] = await Promise.all([
            fetch(
              `${process.env.NEXT_PUBLIC_URL}/api/market/user-listings?id=${tgUser.id.toString()}`
            ),
            fetch(
              `${process.env.NEXT_PUBLIC_URL}/api/market/user-offers?id=${tgUser.id.toString()}`
            ),
          ]);
          const userData = await userRes.json();
          const offersData = await offersRes.json();
          setUserListings(userData.listings);
          setUserOffers(offersData.offers);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tgUser]);

  const handleCancelOffer = async (offerId: number) => {
    if (!tgUser) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/market/offers/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-telegram-init-data": initDataRaw ?? "",
          },
          body: JSON.stringify({ offerId }),
        }
      );

      if (!res.ok) throw new Error("Failed to cancel offer");

      toast({
        title: "Отменено",
        description: "Предложение отменено",
      });

      setUserOffers((prev) =>
        prev.map((o) =>
          o.id === offerId ? { ...o, status: "cancelled" } : o
        )
      );
    } catch {
      toast({
        title: "Ошибка",
        description: "Не удалось отменить предложение",
        variant: "destructive",
      });
    }
  };

  const isMyTab = activeTab === "my";
  const isOffersTab = activeTab === "offers";
  const currentListings = isMyTab ? userListings : listings;
  const [page, setPage] = useState(1);
  const cardsPerPage = 10;

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const listingsLeft = currentListings.length - page * cardsPerPage;
  const listingsSkip = (page - 1) * cardsPerPage;
  const pageListings = currentListings.slice(
    listingsSkip,
    listingsSkip + cardsPerPage
  );

  const offersLeft = userOffers.length - page * cardsPerPage;
  const offersSkip = (page - 1) * cardsPerPage;
  const pageOffers = userOffers.slice(offersSkip, offersSkip + cardsPerPage);

  const pendingOffersCount = userOffers.filter(
    (o) => o.status === "pending"
  ).length;
  const activeListingsCount = userListings.filter(
    (l) => l.status === "active"
  ).length;

  return (
    <main className="flex min-h-screen flex-col gap-4 pb-20 md:container">
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

      <div className="px-2">
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="gap-1.5">
              <Store className="h-3.5 w-3.5" />
              Все
              {!isLoading && listings.length > 0 && (
                <span className="ml-0.5 text-[10px] opacity-60">
                  {listings.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Мои
              {!isLoading && activeListingsCount > 0 && (
                <span className="ml-0.5 rounded-full bg-primary/20 px-1.5 text-[10px]">
                  {activeListingsCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Офферы
              {!isLoading && pendingOffersCount > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-500/20 px-1.5 text-[10px] text-amber-500">
                  {pendingOffersCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ListingsList
              listings={pageListings}
              isLoading={isLoading}
              page={page}
              cardsLeft={listingsLeft}
              handleChangePage={setPage}
              showStatus={false}
              currentUserId={tgUser?.id?.toString()}
            />
          </TabsContent>
          <TabsContent value="my" className="mt-4">
            <ListingsList
              listings={pageListings}
              isLoading={isLoading}
              page={page}
              cardsLeft={listingsLeft}
              handleChangePage={setPage}
              showStatus={true}
              currentUserId={tgUser?.id?.toString()}
            />
          </TabsContent>
          <TabsContent value="offers" className="mt-4">
            <OffersList
              offers={pageOffers}
              isLoading={isLoading}
              page={page}
              cardsLeft={offersLeft}
              handleChangePage={setPage}
              onCancel={handleCancelOffer}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function ListingCard({
  listing,
  showStatus,
  isOwn,
}: {
  listing: MarketListing;
  showStatus: boolean;
  isOwn: boolean;
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
      <div className="p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserAvatar name={listing.seller.name} photoUrl={listing.seller.photoUrl} size={32} />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold leading-tight">
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

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {listing.cards.slice(0, 6).map((card) => (
            <div
              key={card.id}
              className="relative h-20 w-[60px] flex-shrink-0 overflow-hidden rounded-lg border shadow-sm"
            >
              <Image
                src={getImageProxyUrl(card.image)}
                alt={card.name}
                fill
                className="object-cover"
              />
            </div>
          ))}
          {listing.cards.length > 6 && (
            <div className="relative flex h-20 w-[60px] flex-shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-xs font-bold text-muted-foreground shadow-sm">
              +{listing.cards.length - 6}
            </div>
          )}
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-5 gap-1 px-1.5 py-0 text-[10px]">
              <ArrowRightLeft className="h-2.5 w-2.5" />
              {listing.cards.length} карт
            </Badge>
            {hasFilters ? (
              <Badge
                variant="outline"
                className="h-5 px-1.5 py-0 text-[10px] text-blue-500"
              >
                Есть требования
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-5 px-1.5 py-0 text-[10px] text-muted-foreground"
              >
                Любые карты
              </Badge>
            )}
          </div>
          <span className="text-xs font-medium text-primary">
            Подробнее &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}

function ListingsList({
  listings,
  isLoading,
  page,
  cardsLeft,
  handleChangePage,
  showStatus,
  currentUserId,
}: {
  listings: MarketListing[];
  isLoading: boolean;
  page: number;
  cardsLeft: number;
  handleChangePage: (page: number) => void;
  showStatus: boolean;
  currentUserId?: string;
}) {
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
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            showStatus={showStatus}
            isOwn={listing.sellerId === currentUserId}
          />
        ))}
      </div>

      <div className="mt-4">
        <CardsPagination
          page={page}
          cardsLeft={cardsLeft}
          handleChangePage={handleChangePage}
        />
      </div>
    </>
  );
}

function OffersList({
  offers,
  isLoading,
  page,
  cardsLeft,
  handleChangePage,
  onCancel,
}: {
  offers: UserOffer[];
  isLoading: boolean;
  page: number;
  cardsLeft: number;
  handleChangePage: (page: number) => void;
  onCancel: (offerId: number) => Promise<void>;
}) {
  const [cancellingId, setCancellingId] = useState<number | null>(null);

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
        {offers.map((offer) => {
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
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {offer.listing.cards.slice(0, 6).map((card) => (
                        <div
                          key={card.id}
                          className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md border shadow-sm"
                        >
                          <Image
                            src={getImageProxyUrl(card.image)}
                            alt={card.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                      {offer.listing.cards.length > 6 && (
                        <div className="relative flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-md border bg-muted/50 text-[10px] font-bold text-muted-foreground shadow-sm">
                          +{offer.listing.cards.length - 6}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-2.5">
                  <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    Ваши карты
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {offer.cards.slice(0, 6).map((card) => (
                      <div
                        key={card.id}
                        className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md border border-primary/30 shadow-sm"
                      >
                        <Image
                          src={getImageProxyUrl(card.image)}
                          alt={card.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                    {offer.cards.length > 6 && (
                      <div className="relative flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-md border bg-muted/50 text-[10px] font-bold text-muted-foreground shadow-sm">
                        +{offer.cards.length - 6}
                      </div>
                    )}
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
          handleChangePage={handleChangePage}
        />
      </div>
    </>
  );
}
