import { getFilterOptions } from "@/components/get-filte-options";
import { CardsPage } from "@/components/pages/all-cards";

export default async function Home() {
  const filterOptions = await getFilterOptions();

  return (
    <main className="flex flex-col gap-4 md:container">
      <CardsPage title="Все карты" filterOptions={filterOptions} />
    </main>
  );
}
