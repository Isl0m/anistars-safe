import { Suspense } from "react";

import { getCardsFull } from "@/lib/queries";

import { CardsList } from "@/components/cards-list";
import { getFilterOptions } from "@/components/get-filte-options";
import { Skeleton } from "@/ui/skeleton";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col gap-4 p-4 md:container">
      <Suspense fallback={<CardsViewSkeleton />}>
        <CardsView />
      </Suspense>
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

function CardsViewSkeleton() {
  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <Skeleton className="h-[200px] w-full md:w-[220px]" />
      <div className="grid grid-cols-3 gap-4 md:gap-8 lg:grid-cols-4">
        {new Array(9).fill(0).map((_, idx) => (
          <Skeleton
            key={"skeleton" + idx}
            className="h-[160px] w-[122px] rounded-[10px] md:h-[320px] md:w-[255px] md:rounded-[12px]"
          />
        ))}
      </div>
    </div>
  );
}
