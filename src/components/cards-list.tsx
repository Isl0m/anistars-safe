"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckIcon, Package, Star, X } from "lucide-react";

import {
  CARDS_PER_PAGE,
  getRarityChipStyle,
  stripRarityEmoji,
} from "@/lib/constants";
import {
  cn,
  getImageProxyUrl,
  techniqueParts,
  prettyNumbers,
} from "@/lib/utils";

import { FullCard } from "@/db/schema/card";
import { useMediaQuery } from "@/hook/use-media-query";

import {
  ReservedBadges,
  ReservedLookup,
  useReservedExplainer,
} from "./pages/trade";
import CardsPagination from "./pagination";
import { Button } from "./ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import { Skeleton } from "./ui/skeleton";

type CardsListProps = {
  cards: FullCard[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  favouriteCardIds?: string[];
  onToggleFavourite?: (cardId: string) => void;
};

export function CardsList({
  cards,
  total,
  page,
  onPageChange,
  favouriteCardIds,
  onToggleFavourite,
}: CardsListProps) {
  const cardsPerPage = CARDS_PER_PAGE;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const cardsLeft = total - page * cardsPerPage;
  const selectedCard = selectedIdx !== null ? cards[selectedIdx] : null;
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const closeDrawer = () => setSelectedIdx(null);
  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
  };
  return (
    <>
      {cards.length > 0 ? (
        <div className="space-y-4 px-2">
          <CardsListRaw cards={cards} onSelect={handleSelect} />
          <CardsPagination
            page={page}
            cardsLeft={cardsLeft}
            handleChangePage={onPageChange}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="rounded-full bg-muted p-4">
            <Package className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">Нет подходящих карт</p>
        </div>
      )}
      <Drawer
        open={selectedCard !== null}
        onClose={closeDrawer}
        direction={isDesktop ? "right" : "bottom"}
        shouldScaleBackground={!isDesktop}
      >
        <DrawerContent
          aria-describedby="card-details"
          direction={isDesktop ? "right" : "bottom"}
          className="h-[88svh] md:h-full"
          overlayClassName="md:bg-black/50"
        >
          {selectedCard !== null ? (
            <CardDetailsContent
              key={selectedCard.id}
              card={selectedCard}
              closeDrawer={closeDrawer}
              favouriteCardIds={favouriteCardIds}
              onToggleFavourite={onToggleFavourite}
            />
          ) : (
            <DrawerHeader>
              <DrawerTitle className="text-xl font-bold">🎴 Карта</DrawerTitle>
            </DrawerHeader>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}

type MediaItem = { key: string; url: string; isGif: boolean };

/** Base art first, then its variants; photos before gifs, as one strip. */
function buildMediaItems(card: FullCard): MediaItem[] {
  const media = card.media ?? [];
  const items: MediaItem[] = [];

  const push = (url: string | null, key: string, isGif: boolean) => {
    if (url) items.push({ key, url, isGif });
  };

  push(card.image, "image", false);
  media
    .filter((m) => m.type === "image")
    .forEach((m) => push(m.url, `image-${m.id}`, false));
  push(card.gif, "gif", true);
  media
    .filter((m) => m.type === "gif")
    .forEach((m) => push(m.url, `gif-${m.id}`, true));

  return items;
}

function GifBadge() {
  return (
    <span className="pointer-events-none absolute bottom-[3px] left-[3px] rounded-[3px] bg-background/85 px-1 py-[2px] font-mono text-[8px] font-semibold text-yellow-300">
      GIF
    </span>
  );
}

function MediaGallery({ card }: { card: FullCard }) {
  const items = buildMediaItems(card);
  const [activeKey, setActiveKey] = useState(items[0]?.key);
  const active = items.find((i) => i.key === activeKey) ?? items[0];
  const glow = getRarityChipStyle(card.rarity).glow;

  if (!active) return null;

  const hasStrip = items.length > 1;

  return (
    <>
      <div
        className={cn(
          "relative flex min-h-0 flex-1 items-center justify-center px-4 md:p-5",
          !hasStrip && "pb-4"
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute h-[280px] w-[280px] max-w-full rounded-full blur-2xl",
            glow
          )}
        />
        <div className="relative flex h-full items-center">
          {active.isGif ? (
            <video
              key={active.url}
              src={active.url}
              autoPlay
              muted
              loop
              playsInline
              className="max-h-full max-w-full rounded-[4px] object-contain"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <Image
              src={getImageProxyUrl(active.url)}
              alt={card.name}
              width={480}
              height={640}
              sizes="(max-width: 768px) 100vw, 400px"
              loading="lazy"
              className="max-h-full w-auto rounded-[4px] object-contain"
            />
          )}
        </div>
      </div>

      {hasStrip && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-3.5 md:px-[22px] md:pb-4 md:pt-0">
          {items.map((item) => {
            const isActive = item.key === active.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveKey(item.key)}
                aria-label={item.isGif ? "Гиф" : "Арт"}
                aria-current={isActive}
                className="relative h-16 w-12 flex-none overflow-hidden rounded-[3px] bg-muted"
              >
                {item.isGif ? (
                  <video
                    src={item.url}
                    muted
                    playsInline
                    preload="metadata"
                    className={cn(
                      "h-full w-full object-cover",
                      isActive ? "opacity-100" : "opacity-[0.72]"
                    )}
                  />
                ) : (
                  <Image
                    src={getImageProxyUrl(item.url)}
                    alt=""
                    fill
                    sizes="48px"
                    loading="lazy"
                    className={cn(
                      "object-cover",
                      isActive ? "opacity-100" : "opacity-[0.72]"
                    )}
                  />
                )}
                {item.isGif && <GifBadge />}
                {isActive && (
                  <span className="pointer-events-none absolute inset-0 rounded-[3px] border-2 border-foreground shadow-[0_0_0_3px_hsl(var(--foreground)/0.14)]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-xs text-muted-foreground md:font-mono md:text-[10px] md:font-medium md:uppercase md:tracking-[0.1em]">
        {label}
      </span>
      <span className="truncate text-sm font-semibold md:text-[13.5px]">
        {value}
      </span>
    </div>
  );
}

function CardDetailsContent({
  card,
  favouriteCardIds,
  onToggleFavourite,
  closeDrawer,
}: {
  card: FullCard;
  closeDrawer: () => void;
  favouriteCardIds?: string[];
  onToggleFavourite?: (id: string) => void;
}) {
  const isFavourite = favouriteCardIds?.includes(card.id) ?? false;

  return (
    <>
      <DrawerHeader className="flex items-start justify-between gap-3 space-y-0 p-4 text-left md:border-b md:px-[22px] md:pb-3.5 md:pt-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <DrawerTitle className="min-w-0 select-text truncate text-[23px] font-bold leading-none tracking-[-0.02em] md:text-[26px] md:font-extrabold md:tracking-[-0.025em]">
            {card.name}
          </DrawerTitle>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-[9px] py-[3px] text-[11px] font-semibold leading-none",
                getRarityChipStyle(card.rarity).base
              )}
            >
              {stripRarityEmoji(card.rarity)}
            </span>
            <CardTypeChip droppable={card.droppable} />
          </div>
        </div>
        <DrawerClose
          onClick={closeDrawer}
          aria-label="Закрыть"
          className="hidden h-[30px] w-[30px] flex-none items-center justify-center rounded-lg border text-muted-foreground md:flex"
        >
          <X className="h-4 w-4" />
        </DrawerClose>
      </DrawerHeader>

      <div
        id="card-details"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <MediaGallery card={card} />

        <div className="grid grid-cols-2 gap-x-3.5 gap-y-3 border-t px-4 py-3.5 md:px-[22px] md:py-4">
          <StatCell label="💎 Редкость" value={stripRarityEmoji(card.rarity)} />
          <StatCell label="⚜️ Класс" value={card.class} />
          <StatCell label="👤 Автор" value={card.author} />
          <StatCell label="🪐 Вселенная" value={card.universe} />
          <StatCell label="💰 Цена" value={`${prettyNumbers(card.price)}✨`} />
          <StatCell label="Количество" value={prettyNumbers(card.quantity)} />

          {card.techniques && card.techniques.length > 0 && (
            <div className="col-span-2 flex items-center gap-2">
              <span className="flex-none text-[12px]">🦾</span>
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                {card.techniques.map((technique) => {
                  const { effect, slug } = techniqueParts(technique);
                  return (
                    <span
                      key={technique.id}
                      className="inline-flex flex-none items-baseline gap-1.5 whitespace-nowrap rounded-[7px] border bg-[#111c31] px-[9px] py-1"
                    >
                      <span className="text-[12.5px] font-semibold">{effect}</span>
                      <span className="font-mono text-[10px] font-medium text-[#64748b]">
                        {slug}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <DrawerFooter className="flex-row gap-2 px-4 pb-5 pt-0 md:px-[22px]">
        {onToggleFavourite && (
          <Button
            variant={isFavourite ? "default" : "outline"}
            className="h-11 flex-1 gap-2 md:h-[42px]"
            onClick={() => onToggleFavourite(card.id)}
          >
            <Star className={cn("h-4 w-4", isFavourite && "fill-current")} />
            {isFavourite ? "В избранном" : "В избранное"}
          </Button>
        )}
        <DrawerClose asChild onClick={closeDrawer}>
          <Button variant="secondary" className="h-11 flex-1 md:h-[42px]">
            Закрыть
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </>
  );
}

type CardBase = {
  id: string | number;
  image: string;
  slug: string;
  droppable?: boolean;
};

function LimitedBadge() {
  return (
    <div className="pointer-events-none absolute left-[5px] top-[5px] flex items-center gap-1 rounded-[5px] bg-[rgba(2,8,23,.82)] px-1.5 py-0.5 backdrop-blur-[4px]">
      <span className="h-1 w-1 rounded-full bg-[#ef4444]" />
      <span className="font-mono text-[8.5px] font-semibold tracking-[.06em] text-[#fca5a5]">
        ЛИМИТ
      </span>
    </div>
  );
}

function CardTypeChip({ droppable }: { droppable: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[5px] rounded-full border px-[9px] py-[3px] text-[11px] font-semibold leading-none",
        droppable
          ? "border-[rgba(34,197,94,.3)] bg-[rgba(34,197,94,.1)] text-[#86efac]"
          : "border-[rgba(239,68,68,.32)] bg-[rgba(239,68,68,.1)] text-[#fca5a5]"
      )}
    >
      <span
        className={cn(
          "h-[5px] w-[5px] rounded-full",
          droppable ? "bg-[#22c55e]" : "bg-[#ef4444]"
        )}
      />
      {droppable ? "Базовая" : "Лимитная"}
    </span>
  );
}

export function CardsListRaw({
  cards,
  onSelect,
}: {
  cards: CardBase[];
  onSelect?: (id: number) => void;
}) {
  return (
    <ul className="grid grid-cols-4 gap-2 md:container md:grid-cols-5 md:gap-4 lg:grid-cols-6">
      {cards.map((card, idx) => (
        <li
          key={`${card.id}-${idx}`}
          className="relative"
          onClick={() => onSelect && onSelect(idx)}
        >
          <CardImage {...card} />
        </li>
      ))}
    </ul>
  );
}

function CardImage({ image, slug, droppable }: CardBase) {
  const [loaded, setLoaded] = useState(false);
  const limited = droppable === false;

  return (
    <>
      {!loaded && (
        <Skeleton className="absolute inset-0 h-full w-full rounded" />
      )}

      <Image
        src={getImageProxyUrl(image)}
        width={240}
        height={320}
        alt={slug}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          "rounded transition-opacity duration-300",
          limited && "shadow-[inset_0_0_0_1.5px_rgba(239,68,68,.55)]",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
      {limited && loaded && <LimitedBadge />}
    </>
  );
}

type CardsSelectListProps = {
  cards: FullCard[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  selectedCards: FullCard[];
  onClick: (card: FullCard) => () => void;
  reserved?: ReservedLookup;
};

export function CardsSelectListServer({
  cards,
  total,
  page,
  selectedCards,
  onPageChange,
  onClick,
  reserved,
}: CardsSelectListProps) {
  const cardsPerPage = CARDS_PER_PAGE;
  const cardsLeft = total - page * cardsPerPage;
  const explainer = useReservedExplainer();
  return (
    <section className="flex flex-col gap-4">
      {explainer.node}
      {cards.length > 0 ? (
        <div className="space-y-4">
          <ul className="grid grid-cols-4 gap-2">
            {cards.map((card) => {
              const isSelected = selectedCards.some((s) => s.id === card.id);
              return (
                <li
                  key={card.id}
                  className={`relative cursor-pointer overflow-hidden rounded-md transition-all duration-100 ease-in-out ${
                    isSelected
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      : "hover:ring-1 hover:ring-primary/50"
                  }`}
                  onClick={onClick(card)}
                >
                  <Image
                    src={getImageProxyUrl(card.image)}
                    width={240}
                    height={320}
                    className="rounded-md"
                    loading="lazy"
                    alt={card.slug}
                  />
                  {isSelected && (
                    <div className="absolute right-1 top-1 rounded-full bg-primary p-1">
                      <CheckIcon className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  {reserved && (
                    <ReservedBadges
                      listed={reserved.listed.has(card.id)}
                      offered={reserved.offered.has(card.id)}
                      onExplain={explainer.open}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <CardsPagination
            page={page}
            cardsLeft={cardsLeft}
            handleChangePage={onPageChange}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="rounded-full bg-muted p-4">
            <Package className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">Нет подходящих карт</p>
        </div>
      )}
    </section>
  );
}
