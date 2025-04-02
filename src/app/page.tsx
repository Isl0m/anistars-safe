import { Suspense } from "react";

import { getCardsFull } from "@/lib/queries";

import { CardsList } from "@/components/cards-list";
import { getFilterOptions } from "@/components/get-filte-options";
import { Skeleton } from "@/ui/skeleton";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <CardsView />
    </main>
  );
}

async function CardsView() {
  const cards = await getCardsFull();

  const filterOptions = await getFilterOptions();

  return (
    <CardsList title="Все карты" cards={cards} filterOptions={filterOptions} />
  );
}
