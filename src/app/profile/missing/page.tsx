import { getFilterOptions } from "@/components/get-filter-options";
import { Missing } from "@/components/pages/missing";

export default async function MissingPage() {
  const filterOptions = await getFilterOptions();
  return (
    <main className="flex flex-col gap-4">
      <Missing filterOptions={filterOptions} />
    </main>
  );
}
