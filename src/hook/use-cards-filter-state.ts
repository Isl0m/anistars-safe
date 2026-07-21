import { useState } from "react";

import { Filter } from "@/components/get-filter-options";

const DEFAULT_FILTER = { sort: "power-desc" } as Filter;

export function useCardsFilterState(defaultFilter: Filter = DEFAULT_FILTER) {
  const [filter, setFilter] = useState<Filter>(defaultFilter);
  const [page, setPage] = useState(1);

  const handleFilterChange = (data: Filter) => {
    setFilter(data);
    setPage(1);
  };

  const handleChangePage = (page: number) => {
    setPage(page);
  };

  return {
    filter,
    page,
    handleChangePage,
    handleFilterChange,
  };
}
