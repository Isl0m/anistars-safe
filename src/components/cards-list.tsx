"use client";

import { useState } from "react";
import Image from "next/image";

import { isKey } from "@/lib/utils";

import { FullCard, Technique } from "@/db/schema/card";

import CardsFilter from "./cards-filter";
import { FilterOption } from "./get-filte-options";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

type Props = {
  title: string;
  cards: FullCard[];
  filterOptions: FilterOption[];
};

export function CardsList({ title, cards, filterOptions }: Props) {
  let cardsPerPage = 12;
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Map<string, string>>(new Map());
  const [filteredCards, setFilteredCards] = useState<FullCard[]>(cards);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const cardsLeft = filteredCards.length - page * cardsPerPage;

  const skip = (page - 1) * cardsPerPage;
  const pageCards = filteredCards.slice(skip, skip + cardsPerPage);

  const handleFilterSelect = (key: string, value: string) => {
    if (!value) return;
    setFilter((prev) => prev.set(key, value));

    setFilteredCards(() =>
      cards.filter((card) => {
        if (filter.size <= 0) return true;
        for (let [key, value] of filter) {
          if (isKey(card, key)) {
            if (key === "technique") {
              const technique = card[key];
              if (!technique) return false;
              if (value === "power" && !technique.power) return false;
              if (value === "heal" && !technique.heal) return false;
              if (value === "dodge" && !technique.dodge) return false;
            } else if (String(card[key]) !== value) {
              return false;
            }
          }
        }
        return true;
      })
    );
    setPage(1);
  };
  const handleFilterReset = () => {
    setFilter(new Map());
    setFilteredCards(cards);
    setPage(1);
  };

  const handleChangePage = (page: number) => {
    setPage(page);
  };

  const parseTechnique = (technique: Technique) => {
    const chance = technique.chance * 100;
    const power = technique.power && `⚔️${technique.power * 100}%`;
    const heal = technique.heal && `♥️${technique.heal * 100}%`;
    const dodge = technique.dodge && `Уклонение`;
    return `${technique.slug} | ${power || heal || dodge} 🎰${chance}%\n`;
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">{title}</h2>
        <CardsFilter
          filterOptions={filterOptions}
          onFilterSelect={handleFilterSelect}
          onFiltersReset={handleFilterReset}
        />
      </div>
      <section className="flex flex-col gap-12 md:flex-row">
        {pageCards.length > 0 ? (
          <div className="space-y-8">
            <ul className="grid grid-cols-3 gap-2 md:grid-cols-3 md:gap-8 lg:grid-cols-4">
              {pageCards.map((card, idx) => (
                <li key={card.id} onClick={() => setSelectedCard(idx)}>
                  <Image
                    src={card.image}
                    width={255}
                    height={320}
                    alt={card.slug}
                  />
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
      <Drawer open={!!selectedCard} onClose={() => setSelectedCard(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-2xl font-bold">
              {selectedCard ? `${pageCards[selectedCard].name}` : "🎴 Карта"}
            </DrawerTitle>
          </DrawerHeader>
          {selectedCard && (
            <div className="space-y-4 p-4">
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
                      objectFit="contain"
                      className="rounded-lg"
                    />
                  </div>
                </TabsContent>
                <TabsContent value="video">
                  <div className="relative h-64 w-full">
                    <video
                      src={pageCards[selectedCard].gif!}
                      autoPlay
                      muted
                      className="h-full w-full rounded-lg object-contain"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">💎 Редкость:</p>
                  <p>{pageCards[selectedCard].rarity}</p>
                </div>
                <div>
                  <p className="font-semibold">🪐 Вселенная:</p>
                  <p>{pageCards[selectedCard].universe}</p>
                </div>
                <div>
                  <p className="font-semibold">⚜️ Класс:</p>
                  <p>{pageCards[selectedCard].class}</p>
                </div>
                <div>
                  <p className="font-semibold">👤 Автор:</p>
                  <p>{pageCards[selectedCard].author}</p>
                </div>
                {pageCards[selectedCard].technique !== null && (
                  <div className="col-span-2">
                    <p className="font-semibold">🦾 Техника:</p>
                    <p>{parseTechnique(pageCards[selectedCard].technique!)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Закрыть</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
