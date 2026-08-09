import { useEffect, useState } from "react";

export function useClientPagination<T>(items: T[], perPage: number) {
  const [page, setPage] = useState(1);
  const maxPage = Math.max(1, Math.ceil(items.length / perPage));

  useEffect(() => {
    if (page > maxPage) setPage(1);
  }, [page, maxPage]);

  const skip = (page - 1) * perPage;
  const pageItems = items.slice(skip, skip + perPage);
  const cardsLeft = items.length - page * perPage;

  return { page, setPage, pageItems, cardsLeft, maxPage };
}
