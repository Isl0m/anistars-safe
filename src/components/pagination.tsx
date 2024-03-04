"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type Props = {
  page: number;
  cardsLeft: number;
  handleChangePage: (page: number) => void;
};

export default function CardsPagination({
  page,
  cardsLeft,
  handleChangePage,
}: Props) {
  const prevPagination = () => {
    if (page === 1) {
      return "#";
    }
    handleChangePage(page - 1);
    return "#";
  };
  const nextPagination = () => {
    if (cardsLeft <= 0) {
      return "#";
    }
    handleChangePage(page + 1);
    return "#";
  };
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#" onClick={prevPagination} />
        </PaginationItem>

        <PaginationItem>
          <PaginationLink href="#" isActive>
            {page}
          </PaginationLink>
        </PaginationItem>
        {cardsLeft > 0 && (
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        )}
        <PaginationItem>
          <PaginationNext href="#" onClick={nextPagination} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
