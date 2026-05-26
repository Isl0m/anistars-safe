"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, Info, Loader2 } from "lucide-react";

import { getImageProxyUrl } from "@/lib/utils";

import { Card } from "@/db/schema/card";
import { User } from "@/db/schema/user";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog";
import { Skeleton } from "@/ui/skeleton";
import { toast } from "@/ui/use-toast";

import { FilterOption, ListingFilters } from "../get-filte-options";
import { Header } from "../header";
import { ListingFilterDisplay } from "../listing-filter-display";
import { useTelegram } from "../telegram-provider";

const offerStatusMap: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Ожидание",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  },
  accepted: {
    label: "Принято",
    className: "border-green-500/30 bg-green-500/10 text-green-600",
  },
  cancelled: {
    label: "Отклонено",
    className: "border-red-500/30 bg-red-500/10 text-red-600",
  },
};

type MarketListing = {
  id: number;
  sellerId: string;
  status: string;
  createdAt: Date;
  seller: User;
  cards: Card[];
  filters: ListingFilters | null;
};

type MarketOffer = {
  id: number;
  buyerId: string;
  status: string;
  createdAt: Date;
  buyer: User;
  cards: Card[];
};

export default function MarketViewPage({ id }: { id: string }) {
  const { tgUser } = useTelegram();
  const router = useRouter();
  const [listing, setListing] = useState<MarketListing | null>(null);
  const [offers, setOffers] = useState<MarketOffer[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [buyerHasOffer, setBuyerHasOffer] = useState(false);

  const fetchData = async () => {
    try {
      const [listingRes, filtersRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_URL}/api/market/listings/${id}`),
        fetch(`${process.env.NEXT_PUBLIC_URL}/api/cards/filter-options`),
      ]);

      const listingData = await listingRes.json();
      const filtersData = await filtersRes.json();

      setListing(listingData.listing);
      setFilterOptions(filtersData.filterOptions);

      if (tgUser) {
        const isSeller = listingData.listing.sellerId === tgUser.id.toString();

        if (isSeller) {
          const offersRes = await fetch(
            `${process.env.NEXT_PUBLIC_URL}/api/market/listings/${id}/offers`
          );
          const offersData = await offersRes.json();
          setOffers(offersData.offers);
        } else {
          const offersRes = await fetch(
            `${process.env.NEXT_PUBLIC_URL}/api/market/listings/${id}/offers`
          );
          const offersData = await offersRes.json();
          const hasOffer = (offersData.offers as MarketOffer[]).some(
            (o) => o.buyerId === tgUser.id.toString() && o.status === "pending"
          );
          setBuyerHasOffer(hasOffer);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, tgUser]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col gap-4">
        <Header title="Загрузка..." />
        <div className="flex flex-col gap-4 p-4">
          <Skeleton className="h-64 rounded" />
          <Skeleton className="h-20 rounded" />
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="flex min-h-screen flex-col gap-4">
        <Header title="Не найдено" />
        <div className="flex flex-col items-center justify-center p-10">
          <p>Объявление не найдено или было удалено</p>
          <Button onClick={() => router.back()} className="mt-4">
            Назад
          </Button>
        </div>
      </main>
    );
  }

  const isSeller = tgUser?.id?.toString() === listing.sellerId;

  const handleAcceptOffer = async (offerId: number) => {
    setIsAccepting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/market/offers/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offerId,
            sellerId: tgUser?.id.toString(),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept offer");
      }

      toast({
        title: "Успешно",
        description: "Вы приняли предложение обмена!",
      });
      router.push("/market");
    } catch (e) {
      toast({
        title: "Ошибка",
        description:
          e instanceof Error ? e.message : "Не удалось принять предложение",
        variant: "destructive",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectOffer = async (offerId: number) => {
    setIsRejecting(offerId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/market/offers/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offerId,
            sellerId: tgUser?.id.toString(),
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to reject offer");

      toast({
        title: "Отклонено",
        description: "Предложение отклонено",
      });

      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status: "cancelled" } : o))
      );
    } catch (e) {
      toast({
        title: "Ошибка",
        description: "Не удалось отклонить предложение",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(null);
    }
  };

  const handleCancelListing = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/market/listings/${listing.id}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sellerId: tgUser?.id.toString(),
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to cancel listing");

      toast({
        title: "Отменено",
        description: "Объявление отменено",
      });

      router.push("/market");
    } catch (e) {
      toast({
        title: "Ошибка",
        description: "Не удалось отменить объявление",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Header
        title="Объявление"
        element={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Назад
          </Button>
        }
      />
      <section className="flex-1 gap-4 overflow-y-auto px-2 py-4 md:container">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex flex-col">
            <span className="text-lg font-bold">{listing.seller.name}</span>
            <span className="text-xs text-muted-foreground">
              ID Продавца: {listing.sellerId}
            </span>
          </div>
          <Badge
            variant={listing.status === "active" ? "default" : "secondary"}
          >
            {listing.status === "active"
              ? "Активно"
              : listing.status === "completed"
                ? "Завершено"
                : "Отменено"}
          </Badge>
        </div>

        <div className="space-y-4">
          <h3 className="text-md font-semibold">Карты в предложении:</h3>
          <ul className="grid grid-cols-4 gap-2">
            {listing.cards.map((card) => (
              <li
                key={card.id}
                className="relative aspect-[3/4] overflow-hidden rounded-lg border shadow-sm"
              >
                <Image
                  src={getImageProxyUrl(card.image)}
                  alt={card.name}
                  fill
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        </div>

        {listing.filters && (
          <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Желаемые карты:</h3>
            <ListingFilterDisplay
              filters={listing.filters}
              filterOptions={filterOptions}
            />
          </div>
        )}

        {isSeller && listing.status === "active" && (
          <div className="mt-4">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              disabled={isCancelling}
              onClick={handleCancelListing}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Отмена...
                </>
              ) : (
                "Отменить объявление"
              )}
            </Button>
          </div>
        )}

        {isSeller && offers.length > 0 ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-1">
              <h3 className="text-lg font-bold">Входящие предложения</h3>
              <Badge variant="secondary">{offers.length}</Badge>
            </div>
            <div className="space-y-4">
              {offers.map((offer) => {
                const statusInfo =
                  offerStatusMap[offer.status] ?? offerStatusMap.pending;
                const isPending = offer.status === "pending";

                return (
                  <div
                    key={offer.id}
                    className={`space-y-4 rounded-xl border bg-card p-4 shadow-md transition-all ${!isPending ? "opacity-70" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {offer.buyer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">
                            {offer.buyer.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(offer.createdAt).toLocaleString("ru-RU", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={statusInfo.className}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5">
                      {offer.cards.map((card) => (
                        <div
                          key={card.id}
                          className="relative aspect-[3/4] overflow-hidden rounded-md border shadow-sm"
                        >
                          <Image
                            src={getImageProxyUrl(card.image)}
                            alt={card.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>

                    {isPending && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          disabled={isRejecting === offer.id}
                          onClick={() => handleRejectOffer(offer.id)}
                        >
                          {isRejecting === offer.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Отклонить
                        </Button>
                        <AcceptOfferDialog
                          offer={offer}
                          listingCards={listing.cards}
                          onAccept={() => handleAcceptOffer(offer.id)}
                          isLoading={isAccepting}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : isSeller ? (
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
            <p className="text-sm italic text-muted-foreground">
              Это ваше объявление. Как только кто-то сделает предложение, оно
              появится здесь.
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
            <p className="text-sm italic text-muted-foreground">
              Вы можете предложить свои карты в обмен на карты продавца.
            </p>

            {listing.status === "active" &&
              (buyerHasOffer ? (
                <Badge
                  variant="secondary"
                  className="mx-auto px-4 py-2 text-sm"
                >
                  Вы уже предложили обмен
                </Badge>
              ) : (
                <Button
                  size="lg"
                  className="w-full font-bold shadow-xl"
                  onClick={() => router.push(`/market/${listing.id}/offer`)}
                >
                  Предложить обмен
                </Button>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AcceptOfferDialog({
  offer,
  listingCards,
  onAccept,
  isLoading,
}: {
  offer: MarketOffer;
  listingCards: Card[];
  onAccept: () => void;
  isLoading: boolean;
}) {
  const [step, setStep] = useState(1);

  return (
    <Dialog onOpenChange={(open) => !open && setStep(1)}>
      <DialogTrigger asChild>
        <Button className="h-10 w-full font-bold shadow-lg shadow-primary/20">
          Принять
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Обзор обмена" : "Подтверждение"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Вы отдаете:
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {listingCards.map((card) => (
                  <div
                    key={card.id}
                    className="relative aspect-[3/4] overflow-hidden rounded border"
                  >
                    <Image
                      src={getImageProxyUrl(card.image)}
                      alt={card.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center py-2">
              <div className="rounded-full bg-muted p-2">
                <ChevronLeft className="h-6 w-6 rotate-[-90deg]" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Вы получите от {offer.buyer.name}:
              </h4>
              <div className="grid grid-cols-5 gap-2">
                {offer.cards.map((card) => (
                  <div
                    key={card.id}
                    className="relative aspect-[3/4] overflow-hidden rounded border"
                  >
                    <Image
                      src={getImageProxyUrl(card.image)}
                      alt={card.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={() => setStep(2)} className="w-full">
              Продолжить
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4 text-center">
            <div className="mx-auto w-fit rounded-full bg-yellow-500/10 p-4">
              <Info className="h-12 w-12 text-yellow-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Вы уверены?</h3>
              <p className="text-sm text-muted-foreground">
                Это действие необратимо. Карты будут немедленно перенесены между
                аккаунтами.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="w-full"
              >
                Назад
              </Button>
              <Button
                onClick={onAccept}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Обработка..." : "Подтверждаю"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
