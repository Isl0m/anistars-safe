import { CardsPage } from "@/components/cards-list";
import { getFilterOptions } from "@/components/get-filte-options";

export default async function Home() {
  const filterOptions = await getFilterOptions();

  return (
    <main className="flex flex-col gap-4 md:container">
      <CardsPage title="Все карты" filterOptions={filterOptions} />
    </main>
  );
}
