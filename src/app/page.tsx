import { Suspense } from "react";

import { getCards } from "@/lib/queries";

import { CardsList } from "@/components/cards-list";
import { getFilterOptions } from "@/components/get-filte-options";
import { Skeleton } from "@/ui/skeleton";

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
  const cards = await getCards();

  const filterOptions = await getFilterOptions();

  return <CardsList cards={cards} filterOptions={filterOptions} />;
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
