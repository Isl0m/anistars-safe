import { z } from "zod";

import { MAX_LISTING_CARDS } from "@/lib/constants";

const cardId = z.string().min(1).max(64);

/**
 * Mirrors `ListingFilters` in components/get-filter-options.ts.
 *
 * This is stored verbatim into a `jsonb` column and read back for rendering,
 * so without a strict schema any client can persist arbitrary JSON of
 * arbitrary size under their own listing.
 */
export const listingFiltersSchema = z
  .object({
    classIds: z.number().int().positive().array().max(50).default([]),
    rarityIds: z.number().int().positive().array().max(50).default([]),
    universeIds: z.number().int().positive().array().max(50).default([]),
    type: z
      .enum(["upgrade", "upgradable", "limited", "basic"])
      .array()
      .max(4)
      .default([]),
    stats: z.enum(["full", "pre-full", "basic"]).array().max(3).default([]),
    minCardPrice: z.number().int().min(0).max(1_000_000).optional(),
    minCardCount: z.number().int().min(1).max(MAX_LISTING_CARDS).optional(),
    maxCardCount: z.number().int().min(1).max(MAX_LISTING_CARDS).optional(),
  })
  .strict()
  .refine(
    (f) =>
      f.minCardCount === undefined ||
      f.maxCardCount === undefined ||
      f.minCardCount <= f.maxCardCount,
    { message: "minCardCount cannot exceed maxCardCount" }
  );

export const createListingSchema = z.object({
  cardIds: cardId.array().min(1).max(MAX_LISTING_CARDS),
  filters: listingFiltersSchema.nullish(),
});

export const createOfferSchema = z.object({
  listingId: z.number().int().positive(),
  // Capped here as well as against the listing's own filters — a listing
  // created without filters used to accept an offer of unbounded size.
  cardIds: cardId.array().min(1).max(MAX_LISTING_CARDS),
});

export const offerIdSchema = z.object({
  offerId: z.number().int().positive(),
});
