"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Package, Plus, Send } from "lucide-react";

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

type MarketListing = {
  id: number;
  sellerId: string;
  status: string;
  createdAt: Date;
  seller: User;
  cards: Card[];
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
  let cardsPerPage = 10;

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

  const handleChangePage = (page: number) => {
    setPage(page);
  };

  return (
    <main className="flex min-h-screen flex-col gap-4 pb-20 md:container">
      <Header
        title="Маркетплейс"
        element={
          <Link
            href="/market/create"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Plus className="mr-1 h-4 w-4" /> Выставить
          </Link>
        }
      />

      <div className="px-2">
        <Tabs defaultValue="all" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="my">Мои</TabsTrigger>
            <TabsTrigger value="offers">Предложения</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <ListingsList
              listings={pageListings}
              isLoading={isLoading}
              page={page}
              cardsLeft={listingsLeft}
              handleChangePage={handleChangePage}
              showStatus={false}
            />
          </TabsContent>
          <TabsContent value="my" className="mt-4">
            <ListingsList
              listings={pageListings}
              isLoading={isLoading}
              page={page}
              cardsLeft={listingsLeft}
              handleChangePage={handleChangePage}
              showStatus={true}
            />
          </TabsContent>
          <TabsContent value="offers" className="mt-4">
            <OffersList
              offers={pageOffers}
              isLoading={isLoading}
              page={page}
              cardsLeft={offersLeft}
              handleChangePage={handleChangePage}
              onCancel={handleCancelOffer}
            />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function ListingsList({
  listings,
  isLoading,
  page,
  cardsLeft,
  handleChangePage,
  showStatus,
}: {
  listings: MarketListing[];
  isLoading: boolean;
  page: number;
  cardsLeft: number;
  handleChangePage: (page: number) => void;
  showStatus: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-24 rounded" />
        <Skeleton className="h-24 rounded" />
        <Skeleton className="h-24 rounded" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Package className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Нет объявлений</p>
        <Link
          href="/market/create"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Plus className="mr-1 h-4 w-4" /> Выставить карты
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {listings.map((listing) => {
          const statusInfo =
            listingStatusMap[listing.status] ?? listingStatusMap.active;

          return (
            <div
              key={listing.id}
              className="rounded-lg border border-border bg-card p-3 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {listing.seller.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(listing.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  {showStatus && (
                    <Badge variant={statusInfo.variant} className="text-[10px]">
                      {statusInfo.label}
                    </Badge>
                  )}
                </div>
                <Link
                  href={`/market/${listing.id}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Посмотреть
                </Link>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {listing.cards.slice(0, 8).map((card) => (
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
                {listing.cards.length > 8 && (
                  <div className="relative flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-md border bg-muted text-[10px] font-bold shadow-sm">
                    +{listing.cards.length - 8}
                  </div>
                )}
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
      <div className="flex flex-col gap-2">
        <Skeleton className="h-24 rounded" />
        <Skeleton className="h-24 rounded" />
        <Skeleton className="h-24 rounded" />
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <Send className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Нет предложений</p>
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
      <div className="space-y-2">
        {offers.map((offer) => {
          const statusInfo =
            offerStatusMap[offer.status] ?? offerStatusMap.pending;
          const isPending = offer.status === "pending";

          return (
            <div
              key={offer.id}
              className={`rounded-lg border border-border bg-card p-3 shadow-sm ${!isPending ? "opacity-70" : ""}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">
                      {offer.listing?.seller.name ?? "Удалено"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(offer.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <Badge variant="outline" className={statusInfo.className}>
                    {statusInfo.label}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  {isPending && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={cancellingId === offer.id}
                      onClick={() => handleCancel(offer.id)}
                    >
                      {cancellingId === offer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Отменить"
                      )}
                    </Button>
                  )}
                  {offer.listing && (
                    <Link
                      href={`/market/${offer.listingId}`}
                      className={buttonVariants({ size: "sm" })}
                    >
                      Посмотреть
                    </Link>
                  )}
                </div>
              </div>

              {offer.listing && (
                <div className="mb-2">
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Карты продавца:
                  </span>
                  <div className="mt-1 flex gap-1.5 overflow-x-auto pb-1">
                    {offer.listing.cards.slice(0, 6).map((card) => (
                      <div
                        key={card.id}
                        className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded-md border shadow-sm"
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
                      <div className="relative flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-md border bg-muted text-[10px] font-bold shadow-sm">
                        +{offer.listing.cards.length - 6}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Ваши карты:
                </span>
                <div className="mt-1 flex gap-1.5 overflow-x-auto pb-1">
                  {offer.cards.slice(0, 6).map((card) => (
                    <div
                      key={card.id}
                      className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded-md border border-primary/30 shadow-sm"
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
                    <div className="relative flex h-14 w-10 flex-shrink-0 items-center justify-center rounded-md border bg-muted text-[10px] font-bold shadow-sm">
                      +{offer.cards.length - 6}
                    </div>
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
