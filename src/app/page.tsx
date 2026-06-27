import { getCardsFullWithFilter } from "@/lib/queries";

import { Filter, getFilterOptions } from "@/components/get-filter-options";
import { CardsPage } from "@/components/pages/all-cards";

const DEFAULT_FILTER = { sort: "createdAt-desc" } as Filter;

export const revalidate = 30;

export default async function Home() {
  const [filterOptions, initialCards] = await Promise.all([
    getFilterOptions(),
    getCardsFullWithFilter(DEFAULT_FILTER, 1),
  ]);

  return (
    <main className="flex flex-col gap-4">
      <CardsPage
        title="Все карты"
        filterOptions={filterOptions}
        initialCards={initialCards}
      />
    </main>
  );
}
