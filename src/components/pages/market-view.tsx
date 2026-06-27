"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Clock,
  Eye,
  Info,
  Loader2,
  MessageSquare,
  ShieldAlert,
  UserIcon,
} from "lucide-react";

import { offerStatusMap } from "@/lib/constants";
import { getImageProxyUrl } from "@/lib/utils";

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
import { toast } from "@/ui/use-toast";

import { Header } from "../header";
import { ListingFilterDisplay } from "../listing-filter-display";
import { useApi } from "../use-api";
import { useTelegram } from "../telegram-provider";
import { useFilterOptions } from "../use-filter-options";
import {
  MarketCard,
  MarketOffer,
  marketKeys,
  useMarketListing,
  useMarketOffers,
} from "../use-market";
import { useTelegramBackButton } from "../use-telegram-back-button";
import { UserLink } from "../user-link";

function timeAgo(date: string | Date): string {
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

export default function MarketViewPage({ id }: { id: string }) {
  const { tgUser } = useTelegram();
  const api = useApi();
  const router = useRouter();
  const queryClient = useQueryClient();
  useTelegramBackButton("/market");

  const { data: listing, isLoading: listingLoading } = useMarketListing(id);
  const { data: offers = [], isLoading: offersLoading } = useMarketOffers(id);
  const { data: filterData } = useFilterOptions();
  const filterOptions = filterData?.filterOptions ?? [];

  const isLoading = listingLoading || offersLoading;
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const userIdStr = tgUser?.id?.toString();
  const buyerHasOffer =
    !!userIdStr &&
    listing?.sellerId !== userIdStr &&
    offers.some((o) => o.buyerId === userIdStr && o.status === "pending");

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col gap-4">
        <Header title="Объявление" />
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="flex min-h-screen flex-col gap-4">
        <Header title="Не найдено" />
        <div className="flex flex-col items-center justify-center gap-4 p-10">
          <div className="rounded-full bg-muted p-4">
            <ShieldAlert className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">
            Объявление не найдено или было удалено
          </p>
          <Button onClick={() => router.push("/market")}>
            К маркетплейсу
          </Button>
        </div>
      </main>
    );
  }

  const isSeller = tgUser?.id?.toString() === listing.sellerId;
  const pendingOffers = offers.filter((o) => o.status === "pending");

  const handleAcceptOffer = async (offerId: number) => {
    setIsAccepting(true);
    try {
      await api("/api/market/offers/accept", {
        method: "POST",
        body: { offerId },
      });

      toast({
        title: "Успешно",
        description: "Вы приняли предложение обмена!",
      });
      queryClient.invalidateQueries({ queryKey: marketKeys.listings });
      queryClient.invalidateQueries({ queryKey: marketKeys.listing(id) });
      queryClient.invalidateQueries({ queryKey: marketKeys.offers(id) });
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
      await api("/api/market/offers/reject", {
        method: "POST",
        body: { offerId },
      });

      toast({
        title: "Отклонено",
        description: "Предложение отклонено",
      });

      queryClient.invalidateQueries({ queryKey: marketKeys.offers(id) });
      queryClient.invalidateQueries({ queryKey: marketKeys.listings });
    } catch {
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
      await api(`/api/market/listings/${listing.id}/cancel`, {
        method: "POST",
        body: {},
      });

      toast({
        title: "Отменено",
        description: "Объявление отменено",
      });

      queryClient.invalidateQueries({ queryKey: marketKeys.listings });
      queryClient.invalidateQueries({ queryKey: marketKeys.listing(id) });
      router.push("/market");
    } catch {
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
      <Header title="Объявление" />
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Карты на обмен</h3>
            <Badge variant="secondary" className="text-[10px]">
              <ArrowRightLeft className="mr-1 h-3 w-3" />
              {listing.cards.length} карт
            </Badge>
          </div>
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
              "Отменить объявление"
            )}
          </Button>
        )}

        {!isSeller && listing.status === "active" && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              Предложите свои карты в обмен на карты продавца
            </p>
            {buyerHasOffer ? (
              <Badge
                variant="secondary"
                className="mx-auto px-4 py-2 text-sm"
              >
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
          </div>

          {offers.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 py-8 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {isSeller
                  ? "Ожидайте предложения от других пользователей"
                  : "Пока нет предложений по этому объявлению"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => {
                const statusInfo =
                  offerStatusMap[offer.status] ?? offerStatusMap.pending;
                const isPending = offer.status === "pending";
                const isMyOffer =
                  tgUser?.id?.toString() === offer.buyerId;

                return (
                  <div
                    key={offer.id}
                    className={`rounded-xl border bg-card shadow-sm transition-opacity ${
                      !isPending ? "opacity-60" : ""
                    } ${isMyOffer ? "border-primary/30" : "border-border"}`}
                  >
                    <div className="p-3">
                      <div className="mb-2.5 flex items-center justify-between">
                        <UserLink
                          userId={offer.buyerId}
                          name={offer.buyer.name}
                          photoUrl={offer.buyer.photoUrl}
                          size={28}
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold">
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
                        <Badge
                          variant="outline"
                          className={statusInfo.className}
                        >
                          {statusInfo.label}
                        </Badge>
                      </div>

                      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <ArrowRightLeft className="h-3 w-3" />
                        {offer.cards.length} карт предложено
                      </div>

                      <div className="grid grid-cols-5 gap-1.5">
                        {offer.cards.slice(0, 10).map((card) => (
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
                        {offer.cards.length > 10 && (
                          <div className="relative flex aspect-[3/4] items-center justify-center rounded-md border bg-muted/50 text-xs font-bold text-muted-foreground">
                            +{offer.cards.length - 10}
                          </div>
                        )}
                      </div>

                      {isSeller && isPending && (
                        <div className="mt-3 flex gap-2">
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

                      {!isSeller && !isMyOffer && (
                        <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-[11px] text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          Только просмотр
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
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-destructive/80">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Вы отдаете ({listingCards.length}):
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

            <div className="flex justify-center">
              <div className="rounded-full bg-muted p-2">
                <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
                <UserIcon className="h-3.5 w-3.5" />
                Вы получите от {offer.buyer.name} ({offer.cards.length}):
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
          <div className="space-y-5 py-2 text-center">
            <div className="mx-auto w-fit rounded-full bg-yellow-500/10 p-4">
              <Info className="h-10 w-10 text-yellow-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">Вы уверены?</h3>
              <p className="text-sm text-muted-foreground">
                Это действие необратимо. Карты будут немедленно перенесены между
                аккаунтами.
              </p>
            </div>
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
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Обработка...
                  </>
                ) : (
                  "Подтверждаю"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
