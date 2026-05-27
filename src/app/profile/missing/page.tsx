import { getFilterOptions } from "@/components/get-filter-options";
import { Missing } from "@/components/pages/missing";

export default async function MissingPage() {
  const filterOptions = await getFilterOptions();
  return <Missing filterOptions={filterOptions} />;
}
