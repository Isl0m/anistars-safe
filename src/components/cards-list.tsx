"use client";

import { useState } from "react";
import Image from "next/image";

import { cn, prettyNumbers } from "@/lib/utils";

import { Card, FullCard, Technique } from "@/db/schema/card";

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

export function CardsList({ cards }: { cards: FullCard[] }) {
  let cardsPerPage = 16;
  const [page, setPage] = useState(1);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  if (page != 1 && Math.ceil(cards.length / cardsPerPage) < page) {
    setPage(1);
  }
  const cardsLeft = cards.length - page * cardsPerPage;
  const skip = (page - 1) * cardsPerPage;
  const pageCards = cards.slice(skip, skip + cardsPerPage);

  const handleChangePage = (page: number) => {
    setPage(page);
  };

  const parseTechnique = (technique: Technique) => {
    const power = technique.power && `⚔️${Math.round(technique.power * 100)}%`;
    const heal = technique.heal && `♥️${Math.round(technique.heal * 100)}%`;
    const dodge = technique.dodge && `💨 Уклон`;
    const reflection = technique.reflection && `🪞 Отражение`;
    const techniqueText =
      power && heal ? `${power} ${heal}` : power || heal || dodge || reflection;
    return `${techniqueText} | ${technique.slug}`;
  };
  const closeDrawer = () => setSelectedCard(null);
  return (
    <>
      <section className="flex flex-col gap-12 px-2 md:flex-row">
        {pageCards.length > 0 ? (
          <div className="space-y-4 md:container">
            <ul className="grid grid-cols-4 gap-2 md:gap-8 lg:grid-cols-6">
              {pageCards.map((card, idx) => (
                <li
                  key={card.id}
                  className="relative"
                  onClick={() => setSelectedCard(idx)}
                >
                  <CardImage card={card} />
                </li>
              ))}
            </ul>
            <CardsPagination
              page={page}
              cardsLeft={cardsLeft}
              handleChangePage={handleChangePage}
            />
          </div>
        ) : (
          <h1>Нет подходящих карт</h1>
        )}
      </section>
      <Drawer open={selectedCard !== null} onClose={closeDrawer}>
        <DrawerContent aria-describedby="card-details">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-bold">
              {selectedCard !== null
                ? `${pageCards[selectedCard].name}`
                : "🎴 Карта"}
            </DrawerTitle>
          </DrawerHeader>
          {selectedCard !== null && (
            <div className="space-y-4 px-4">
              <Tabs defaultValue="image" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="image">Фото</TabsTrigger>
                  <TabsTrigger
                    disabled={!pageCards[selectedCard].gif}
                    value="video"
                  >
                    Гиф
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="image">
                  <div className="relative h-64 w-full">
                    <Image
                      src={pageCards[selectedCard].image}
                      alt={pageCards[selectedCard].name}
                      layout="fill"
                      loading="lazy"
                      className="object-contain"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="video">
                  <div className="relative h-64 w-full">
                    <video
                      src={pageCards[selectedCard].gif!}
                      autoPlay
                      muted
                      className="h-full w-full object-contain"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="font-semibold">💎 Редкость:</p>
                  <p>{pageCards[selectedCard].rarity}</p>
                </div>
                <div>
                  <p className="font-semibold">⚜️ Класс:</p>
                  <p>{pageCards[selectedCard].class}</p>
                </div>
                <div>
                  <p className="font-semibold">👤 Автор:</p>
                  <p>{pageCards[selectedCard].author}</p>
                </div>
                <div>
                  <p className="font-semibold">🪐 Вселенная:</p>
                  <p>{pageCards[selectedCard].universe}</p>
                </div>
                <div>
                  <p className="font-semibold">💰 Цена:</p>
                  <p>{prettyNumbers(pageCards[selectedCard].price)}✨</p>
                </div>
                <div>
                  <p className="font-semibold">Количество:</p>
                  <p>{prettyNumbers(pageCards[selectedCard].quantity)}</p>
                </div>
                {pageCards[selectedCard].techniques !== null && (
                  <div className="col-span-3">
                    <p className="font-semibold">🦾 Техника:</p>
                    {pageCards[selectedCard].techniques.map((technique) => (
                      <p key={technique.id}>{parseTechnique(technique)}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DrawerFooter>
            <DrawerClose asChild onClick={closeDrawer}>
              <Button variant="outline">Закрыть</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function CardImage({ card }: { card: Card }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <Skeleton className="absolute inset-0 h-full w-full rounded" />
      )}

      <Image
        src={card.image}
        width={240}
        height={320}
        alt={card.slug}
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
