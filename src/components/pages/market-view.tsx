"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  Clock,
  Copy,
  Info,
  Loader2,
  MessageSquare,
  UserIcon,
} from "lucide-react";

import { api } from "@/lib/api";
import {
  MarketActionResponse,
  showApiError,
  showMarketResult,
} from "@/lib/api-feedback";
import { listingStatusMap, offerStatusMap } from "@/lib/constants";
import { getImageProxyUrl, timeAgo } from "@/lib/utils";

import {
  MarketCard,
  marketKeys,
  MarketListingDetail,
  MarketOffer,
  OfferedCard,
  useMarketListing,
  useMarketOffers,
} from "@/hook/use-market";
import { useTelegramBackButton } from "@/hook/use-telegram-back-button";
import { Badge } from "@/ui/badge";
import { Button, buttonVariants } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog";
import { Skeleton } from "@/ui/skeleton";

import { FilterOption } from "../get-filter-options";
import { Header } from "../header";
import { ListingFilterDisplay } from "../listing-filter-display";
import { useTelegram } from "../telegram-provider";
import { UserLink } from "../user-link";

export default function MarketViewPage({
  id,
  listing: initialListing,
  generatedAt,
  filterOptions,
}: {
  id: string;
  listing: MarketListingDetail;
  generatedAt: number;
  filterOptions: FilterOption[];
}) {
  // Server-rendered with `revalidate = 30`, so the page can arrive showing a
  // listing that has since been cancelled or completed. Re-reading it here
  // also lets an accept or reject refresh the view in place.
  const { data: listing } = useMarketListing(id, initialListing, generatedAt);

  const { userId } = useTelegram();
  const router = useRouter();
  const queryClient = useQueryClient();
  useTelegramBackButton("/market");

  const { data: offers = [], isLoading: offersLoading } = useMarketOffers(id);

  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const buyerHasOffer =
    !!userId &&
    listing.sellerId !== userId &&
    offers.some((o) => o.buyerId === userId && o.status === "pending");

  const isSeller = userId === listing.sellerId;
  const pendingOffers = offers.filter((o) => o.status === "pending");
  const listingStatus =
    listingStatusMap[listing.status] ?? listingStatusMap.active;

  const refreshListingViews = () => {
    queryClient.invalidateQueries({ queryKey: marketKeys.listings });
    queryClient.invalidateQueries({ queryKey: marketKeys.listing(id) });
    queryClient.invalidateQueries({ queryKey: marketKeys.offers(id) });
  };

  const handleAcceptOffer = async (offerId: number) => {
    setIsAccepting(true);
    try {
      const { data } = await api.post<MarketActionResponse>(
        "/api/market/offers/accept",
        { offerId }
      );

      const settled = showMarketResult(data, "Вы приняли предложение обмена!");
      refreshListingViews();
      // Leave the user on the listing while the worker is still running — the
      // outcome is not known yet and /market would show stale state.
      if (settled) router.push("/market");
    } catch (e) {
      showApiError(e, "Не удалось принять предложение");
      refreshListingViews();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleRejectOffer = async (offerId: number) => {
    setIsRejecting(offerId);
    try {
      const { data } = await api.post<MarketActionResponse>(
        "/api/market/offers/reject",
        { offerId }
      );

      showMarketResult(data, "Предложение отклонено");
      refreshListingViews();
    } catch (e) {
      showApiError(e, "Не удалось отклонить предложение");
      refreshListingViews();
    } finally {
      setIsRejecting(null);
    }
  };

  const handleCancelListing = async () => {
    setIsCancelling(true);
    try {
      const { data } = await api.post<MarketActionResponse>(
        `/api/market/listings/${listing.id}/cancel`
      );

      const settled = showMarketResult(data, "Лот снят");
      refreshListingViews();
      if (settled) router.push("/market");
    } catch (e) {
      showApiError(e, "Не удалось снять лот");
      refreshListingViews();
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <Header title={`Лот #${listing.id}`} />
      <section className="flex-1 space-y-4 overflow-y-auto px-3 py-4 pb-24 md:container">
        <div className="flex items-center justify-between">
          <UserLink
            userId={listing.sellerId}
            name={listing.seller.name}
            photoUrl={listing.seller.photoUrl}
            size={40}
            className="gap-3"
          >
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold">
                  {listing.seller.name}
                </span>
                {isSeller && (
                  <Badge
                    variant="outline"
                    className="h-4 px-1.5 py-0 text-[9px] text-muted-foreground"
                  >
                    Вы
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {timeAgo(listing.createdAt)}
              </div>
            </div>
          </UserLink>
          <Badge variant={listingStatus.variant}>{listingStatus.label}</Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Карты на обмен</h3>
            <Badge variant="secondary" className="text-[10px]">
              <ArrowRightLeft className="mr-1 h-3 w-3" />
              {listing.cards.length} карт
            </Badge>
          </div>
          <ul className="grid grid-cols-4 gap-2 md:grid-cols-6 lg:grid-cols-8">
            {listing.cards.map((card) => (
              <li
                key={card.id}
                className="relative aspect-[3/4] overflow-hidden rounded-sm border shadow-sm"
              >
                <Image
                  src={getImageProxyUrl(card.image)}
                  alt={card.name}
                  fill
                  sizes="300px"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        </div>

        {listing.filters && (
          <div className="space-y-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-blue-500">
                Требования к обмену
              </h3>
            </div>
            <ListingFilterDisplay
              filters={listing.filters}
              filterOptions={filterOptions}
            />
          </div>
        )}

        {isSeller && listing.status === "active" && (
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
              "Снять лот"
            )}
          </Button>
        )}

        {!isSeller && listing.status === "active" && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              Предложите свои карты в обмен на карты продавца
            </p>
            {offersLoading ? (
              <Skeleton className="h-11 w-full rounded-md" />
            ) : buyerHasOffer ? (
              <Badge variant="secondary" className="mx-auto px-4 py-2 text-sm">
                Вы уже отправили предложение
              </Badge>
            ) : (
              <Link
                href={`/market/${listing.id}/offer`}
                className={buttonVariants({
                  size: "lg",
                  className: "w-full font-bold",
                })}
              >
                Предложить обмен
              </Link>
            )}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold">Предложения</h3>
            </div>
            {!offersLoading && (
              <div className="flex items-center gap-2">
                {pendingOffers.length > 0 && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600"
                  >
                    {pendingOffers.length} ожидает
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px]">
                  {offers.length} всего
                </Badge>
              </div>
            )}
          </div>

          {offersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-border p-3">
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="aspect-[3/4] rounded-md" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : offers.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 py-8 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {isSeller
                  ? "Ожидайте предложения от других пользователей"
                  : "Пока нет предложений по этому лоту"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {offers.map((offer) => {
                const statusInfo =
                  offerStatusMap[offer.status] ?? offerStatusMap.pending;
                const isPending = offer.status === "pending";
                const isMyOffer = userId === offer.buyerId;

                return (
                  <div
                    key={offer.id}
                    className={`rounded-xl border bg-card shadow-sm transition-opacity ${
                      !isPending ? "opacity-60" : ""
                    } ${isMyOffer ? "border-primary/30" : "border-border"}`}
                  >
                    <div className="p-2.5">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <UserLink
                          userId={offer.buyerId}
                          name={offer.buyer.name}
                          photoUrl={offer.buyer.photoUrl}
                          size={28}
                          className="min-w-0"
                        >
                          <div className="flex min-w-0 flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-semibold">
                                {offer.buyer.name}
                              </span>
                              {isMyOffer && (
                                <Badge
                                  variant="outline"
                                  className="h-4 px-1 py-0 text-[9px] text-muted-foreground"
                                >
                                  Вы
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(offer.createdAt)}
                            </div>
                          </div>
                        </UserLink>
                        <div className="flex flex-shrink-0 items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">
                            <ArrowRightLeft className="mr-1 h-2.5 w-2.5" />
                            {offer.cards.length}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={statusInfo.className}
                          >
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                        {offer.cards.map((card) => (
                          <div
                            key={card.id}
                            title={card.owned ? "Уже есть у вас" : undefined}
                            className={`relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-sm border shadow-sm ${
                              card.owned
                                ? "border-amber-500/60 ring-1 ring-amber-500/40"
                                : ""
                            }`}
                          >
                            <Image
                              src={getImageProxyUrl(card.image)}
                              alt={card.name}
                              fill
                              sizes="300px"
                              className={`object-cover ${
                                card.owned ? "opacity-60" : ""
                              }`}
                            />
                            {card.owned && (
                              <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl-sm bg-amber-500 text-white">
                                <Copy className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      <OfferOwnershipSummary cards={offer.cards} />

                      {isSeller && isPending && (
                        <div className="mt-2.5 flex gap-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 w-full text-xs"
                            disabled={isRejecting === offer.id}
                            onClick={() => handleRejectOffer(offer.id)}
                          >
                            {isRejecting === offer.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Отклонить"
                            )}
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function OfferOwnershipSummary({ cards }: { cards: OfferedCard[] }) {
  const rated = cards.filter((card) => card.owned !== undefined);
  if (rated.length === 0) return null;

  const ownedCount = rated.filter((card) => card.owned).length;
  const newCount = rated.length - ownedCount;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {newCount > 0 && (
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-[10px] text-emerald-600"
        >
          <Check className="mr-1 h-2.5 w-2.5" />
          Новых: {newCount}
        </Badge>
      )}
      {ownedCount > 0 && (
        <Badge
          variant="outline"
          className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-600"
        >
          <Copy className="mr-1 h-2.5 w-2.5" />
          Уже есть: {ownedCount}
        </Badge>
      )}
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
  listingCards: MarketCard[];
  onAccept: () => void;
  isLoading: boolean;
}) {
  const [step, setStep] = useState(1);

  return (
    <Dialog onOpenChange={(open) => !open && setStep(1)}>
      <DialogTrigger asChild>
        <Button className="h-8 w-full text-xs font-bold shadow-lg shadow-primary/20">
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
          <div className="space-y-3 py-2">
            <div className="rounded-xl border bg-card p-3">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <ArrowRightLeft className="h-4 w-4" />
                Вы отдаёте ({listingCards.length})
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
                      sizes="300px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <div className="rounded-full bg-muted p-2">
                <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <div className="rounded-xl border bg-card p-3">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-600">
                <UserIcon className="h-4 w-4" />
                Вы получите от {offer.buyer.name} ({offer.cards.length})
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
                      sizes="300px"
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
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-600">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p className="text-sm leading-snug">
                Это действие необратимо. Карты будут сразу перенесены между
                аккаунтами, остальные офферы лота будут отменены.
              </p>
            </div>

            <p className="text-center text-sm font-semibold">
              Принять предложение от {offer.buyer.name}?
            </p>

            <div className="flex gap-3">
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
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Обработка...
                  </>
                ) : (
                  "Подтвердить"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
