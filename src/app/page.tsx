import { Filter, getFilterOptions } from "@/components/get-filter-options";
import { CardsPage } from "@/components/pages/all-cards";

const DEFAULT_FILTER = { sort: "createdAt-desc" } as Filter;

export const revalidate = 30;

export default async function Home() {
  const filterOptions = await getFilterOptions();

  return (
    <CardsPage filterOptions={filterOptions} defaultFilter={DEFAULT_FILTER} />
  );
}
