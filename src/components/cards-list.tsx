"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckIcon, Package, Star } from "lucide-react";

import { CARDS_PER_PAGE } from "@/lib/constants";
import {
  cn,
  getImageProxyUrl,
  parseTechnique,
  prettyNumbers,
} from "@/lib/utils";

import { FullCard } from "@/db/schema/card";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

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
  const selectedCard = selectedIdx ? cards[selectedIdx] : null;

  const closeDrawer = () => setSelectedIdx(null);
  const handleSelect = (idx: number) => {
    setSelectedIdx(idx);
  };
  return (
    <section>
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
        <h1>Нет подходящих карт</h1>
      )}
      <Drawer open={selectedCard !== null} onClose={closeDrawer}>
        <DrawerContent aria-describedby="card-details">
          {selectedCard ? (
            <CardDetailsContent
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
    </section>
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
      <DrawerHeader>
        <DrawerTitle className="text-xl font-bold">{card.name}</DrawerTitle>
      </DrawerHeader>

      <div id="card-details" className="space-y-4 px-4">
        <Tabs defaultValue="image" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="image">Фото</TabsTrigger>
            <TabsTrigger disabled={!card.gif} value="video">
              Гиф
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image">
            <div className="relative h-64 w-full">
              <Image
                src={getImageProxyUrl(card.image)}
                alt={card.name}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                loading="lazy"
                className="object-contain"
              />
            </div>
          </TabsContent>

          <TabsContent value="video">
            {card.gif && (
              <div className="relative h-64 w-full">
                <video
                  src={card.gif}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-contain"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="font-semibold">💎 Редкость:</p>
            <p>{card.rarity}</p>
          </div>
          <div>
            <p className="font-semibold">⚜️ Класс:</p>
            <p>{card.class}</p>
          </div>
          <div>
            <p className="font-semibold">👤 Автор:</p>
            <p>{card.author}</p>
          </div>
          <div>
            <p className="font-semibold">🪐 Вселенная:</p>
            <p>{card.universe}</p>
          </div>
          <div>
            <p className="font-semibold">💰 Цена:</p>
            <p>{prettyNumbers(card.price)}✨</p>
          </div>
          <div>
            <p className="font-semibold">Количество:</p>
            <p>{prettyNumbers(card.quantity)}</p>
          </div>

          {card.techniques && card.techniques.length > 0 && (
            <div className="col-span-3">
              <p className="font-semibold">🦾 Техника:</p>
              {card.techniques.map((technique) => (
                <p key={technique.id}>{parseTechnique(technique)}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <DrawerFooter className="flex-row gap-2">
        {onToggleFavourite && (
          <Button
            variant={isFavourite ? "default" : "outline"}
            className="flex-1 gap-2"
            onClick={() => onToggleFavourite(card.id)}
          >
            <Star className={cn("h-4 w-4", isFavourite && "fill-current")} />
            {isFavourite ? "В избранном" : "В избранное"}
          </Button>
        )}
        <DrawerClose asChild onClick={closeDrawer}>
          <Button variant="outline" className="flex-1">
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
};

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

function CardImage({ image, slug }: CardBase) {
  const [loaded, setLoaded] = useState(false);

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
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
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
