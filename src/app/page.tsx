import { Suspense } from "react";

import { getCards, getClasses, getRarities, getUniverses } from "@/lib/queries";

import { CardsList } from "@/components/cards-list";
import { Skeleton } from "@/ui/skeleton";

export type FilterOption = {
  key: string;
  name: string;
  items: { id: number; slug: string; name: string }[];
};

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
      <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
        AniStars
      </h1>

      <Suspense fallback={<CardsViewSkeleton />}>
        <CardsView />
      </Suspense>
    </main>
  );
}

async function CardsView() {
  const cardsPerPage = 8;
  const rarities = await getRarities();
  const classes = await getClasses();
  const universes = await getUniverses();
  const cards = await getCards();
  if (!rarities || !classes || !universes || !cards) {
    return (
      <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
        <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
          Something went wrong with fetching data
        </h1>
      </main>
    );
  }

  const filterOptions: FilterOption[] = [
    {
      key: "rarityId",
      name: "Редкость",
      items: rarities,
    },
    {
      key: "classId",
      name: "Стихия",
      items: classes,
    },
    {
      key: "universeId",
      name: "Вселенная",
      items: universes,
    },
  ];

  return (
    <CardsList
      cards={cards}
      cardsPerPage={cardsPerPage}
      filterOptions={filterOptions}
    />
  );
}

function CardsViewSkeleton() {
  return (
    <div className="flex flex-col gap-12 md:flex-row">
      <Skeleton className="h-[250px] w-full md:w-[180px]" />
      <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-4">
        {new Array(8).fill(0).map((_, idx) => (
          <Skeleton
            key={"skeleton" + idx}
            className="h-[240px] w-[190px] rounded-[18px] md:h-[320px] md:w-[255px]"
          />
        ))}
      </div>
    </div>
  );
}
