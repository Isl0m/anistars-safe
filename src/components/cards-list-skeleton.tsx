"use client";

import { Skeleton } from "./ui/skeleton";

export function CardsListSkeleton() {
  const cardsPerPage = 16;
  return (
    <section className="px-2 md:container">
      <div className="grid grid-cols-4 gap-2 md:gap-8 lg:grid-cols-6">
        {new Array(cardsPerPage).fill(1).map((_, idx) => (
          <Skeleton key={idx} className="aspect-[3/4] rounded" />
        ))}
      </div>
    </section>
  );
}
