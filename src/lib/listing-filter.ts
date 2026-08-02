// Types only. This module is imported by both the offer picker (a client
// component) and /api/market/offers, and `@/components/get-filter-options`
// pulls in the query layer — importing a runtime value from there would drag
// the database driver into the browser bundle.
import type { Filter, ListingFilters } from "@/components/get-filter-options";

/**
 * The card filter a listing's requirements describe.
 *
 * Shared by the offer picker, which uses it to decide which cards to show, and
 * by `/api/market/offers`, which uses it to decide which cards to accept. Those
 * two must agree — if the server evaluated its own translation of the same
 * requirements, it could reject a card the picker had just offered.
 */
export function listingFiltersToCardFilter(
  filters: Partial<ListingFilters> | null | undefined
): Filter {
  return {
    authorIds: [],
    classIds: filters?.classIds ?? [],
    universeIds: filters?.universeIds ?? [],
    rarityIds: filters?.rarityIds ?? [],
    stats: filters?.stats ?? [],
    droppable: filters?.type ?? [],
    techniques: [],
    sort: "power-desc",
    minPrice: filters?.minCardPrice,
  };
}
