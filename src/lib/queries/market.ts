import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  ne,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import {
  cardToTgUser,
  tCards,
  tClasses,
  tRarities,
  tUniverses,
} from "@/db/schema/card";
import {
  marketListingCards,
  marketListings,
  marketOfferCards,
  marketOffers,
} from "@/db/schema/market";
import { tgUsers } from "@/db/schema/user";

import { cardPreviewColumns, groupBy, userPublicColumns } from "./shared";

const MARKET_LISTINGS_TAG = "market-listings";

function baseListingsQuery() {
  return db
    .select({
      ...getTableColumns(marketListings),
      seller: userPublicColumns,
    })
    .from(marketListings)
    .innerJoin(tgUsers, eq(marketListings.sellerId, tgUsers.id));
}

async function attachCardsAndOffers<T extends { id: number }>(listings: T[]) {
  if (listings.length === 0) return [];

  const listingIds = listings.map((l) => l.id);

  const [allCards, offerCounts] = await Promise.all([
    db
      .select({
        listingId: marketListingCards.listingId,
        ...cardPreviewColumns,
      })
      .from(marketListingCards)
      .where(inArray(marketListingCards.listingId, listingIds))
      .innerJoin(tCards, eq(tCards.id, marketListingCards.cardId)),
    db
      .select({
        listingId: marketOffers.listingId,
        total: count(),
        pending: count(
          sql`CASE WHEN ${marketOffers.status} = 'pending' THEN 1 END`
        ),
      })
      .from(marketOffers)
      .where(inArray(marketOffers.listingId, listingIds))
      .groupBy(marketOffers.listingId),
  ]);

  const cardsByListing = groupBy(allCards, (c) => c.listingId);
  const offersMap = new Map(
    offerCounts.map((o) => [
      o.listingId,
      { total: o.total, pending: o.pending },
    ])
  );

  return listings.map((listing) => ({
    ...listing,
    cards: cardsByListing.get(listing.id) ?? [],
    offerCount: offersMap.get(listing.id)?.total ?? 0,
    pendingOfferCount: offersMap.get(listing.id)?.pending ?? 0,
  }));
}

export async function getMarketListings() {
  const listings = await baseListingsQuery()
    .where(eq(marketListings.status, "active"))
    .orderBy(desc(marketListings.createdAt));

  return attachCardsAndOffers(listings);
}

export async function getMarketListing(id: number) {
  const listing = await baseListingsQuery()
    .where(eq(marketListings.id, id))
    .then((res) => res[0]);

  if (!listing) return null;

  const cards = await db
    .select(cardPreviewColumns)
    .from(marketListingCards)
    .where(eq(marketListingCards.listingId, id))
    .innerJoin(tCards, eq(tCards.id, marketListingCards.cardId));

  return {
    ...listing,
    cards,
  };
}

export async function getListingForPromo(id: number) {
  const [listing] = await db
    .select({
      id: marketListings.id,
      filters: marketListings.filters,
      status: marketListings.status,
      seller: userPublicColumns,
    })
    .from(marketListings)
    .innerJoin(tgUsers, eq(marketListings.sellerId, tgUsers.id))
    .where(eq(marketListings.id, id));

  if (!listing) return null;

  const cards = await db
    .select({
      id: tCards.id,
      name: tCards.name,
      image: tCards.image,
      power: tCards.power,
      stamina: tCards.stamina,
      price: tCards.price,
      rarity: tRarities.name,
      class: tClasses.name,
      universe: tUniverses.name,
    })
    .from(marketListingCards)
    .innerJoin(tCards, eq(tCards.id, marketListingCards.cardId))
    .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
    .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .where(eq(marketListingCards.listingId, id));

  return { ...listing, cards };
}

export type ListingPromoData = NonNullable<
  Awaited<ReturnType<typeof getListingForPromo>>
>;

export async function getMarketListingMeta(id: number) {
  const [listing] = await db
    .select()
    .from(marketListings)
    .where(eq(marketListings.id, id));
  return listing ?? null;
}

export async function getUserMarketListings(
  userId: string,
  opts?: { status?: "active" | "inactive" }
) {
  const conditions = [eq(marketListings.sellerId, userId)];
  if (opts?.status === "active") {
    conditions.push(eq(marketListings.status, "active"));
  } else if (opts?.status === "inactive") {
    conditions.push(ne(marketListings.status, "active"));
  }

  const listings = await baseListingsQuery()
    .where(and(...conditions))
    .orderBy(desc(marketListings.createdAt));

  return attachCardsAndOffers(listings);
}

export async function getMarketOffersForListing(
  listingId: number,
  sellerId?: string
) {
  const offerColumns = getTableColumns(marketOffers);

  const offers = await db
    .select({
      ...offerColumns,
      buyer: userPublicColumns,
    })
    .from(marketOffers)
    .where(eq(marketOffers.listingId, listingId))
    .innerJoin(tgUsers, eq(marketOffers.buyerId, tgUsers.id))
    .orderBy(desc(marketOffers.createdAt));

  if (offers.length === 0) return [];

  const allCards = await db
    .select({
      offerId: marketOfferCards.offerId,
      ...cardPreviewColumns,
    })
    .from(marketOfferCards)
    .where(
      inArray(
        marketOfferCards.offerId,
        offers.map((o) => o.id)
      )
    )
    .innerJoin(tCards, eq(tCards.id, marketOfferCards.cardId));

  const offeredCardIds = [...new Set(allCards.map((c) => c.id))];
  let ownedCardIds = new Set<string>();
  if (sellerId && offeredCardIds.length > 0) {
    const owned = await db
      .selectDistinct({ cardId: cardToTgUser.cardId })
      .from(cardToTgUser)
      .where(
        and(
          eq(cardToTgUser.tgUserId, sellerId),
          inArray(cardToTgUser.cardId, offeredCardIds)
        )
      );
    ownedCardIds = new Set(owned.map((o) => o.cardId));
  }

  const cardsByOffer = groupBy(allCards, (c) => c.offerId);

  return offers.map((offer) => ({
    ...offer,
    cards: (cardsByOffer.get(offer.id) ?? []).map((card) => ({
      ...card,
      owned: sellerId ? ownedCardIds.has(card.id) : undefined,
    })),
  }));
}

export async function hasPendingOfferFromBuyer(
  listingId: number,
  buyerId: string
) {
  const [existing] = await db
    .select({ id: marketOffers.id })
    .from(marketOffers)
    .where(
      and(
        eq(marketOffers.listingId, listingId),
        eq(marketOffers.buyerId, buyerId),
        eq(marketOffers.status, "pending")
      )
    )
    .limit(1);
  return !!existing;
}

export async function getUserMarketOffers(userId: string) {
  const offerColumns = getTableColumns(marketOffers);

  const offers = await db
    .select({
      ...offerColumns,
      buyer: userPublicColumns,
    })
    .from(marketOffers)
    .where(eq(marketOffers.buyerId, userId))
    .innerJoin(tgUsers, eq(marketOffers.buyerId, tgUsers.id))
    .orderBy(desc(marketOffers.createdAt));

  if (offers.length === 0) return [];

  const offerIds = offers.map((o) => o.id);
  const listingIds = [...new Set(offers.map((o) => o.listingId))];

  const [allOfferCards, allListings, allListingCards] = await Promise.all([
    db
      .select({
        offerId: marketOfferCards.offerId,
        ...cardPreviewColumns,
      })
      .from(marketOfferCards)
      .where(inArray(marketOfferCards.offerId, offerIds))
      .innerJoin(tCards, eq(tCards.id, marketOfferCards.cardId)),

    baseListingsQuery().where(inArray(marketListings.id, listingIds)),

    db
      .select({
        listingId: marketListingCards.listingId,
        ...cardPreviewColumns,
      })
      .from(marketListingCards)
      .where(inArray(marketListingCards.listingId, listingIds))
      .innerJoin(tCards, eq(tCards.id, marketListingCards.cardId)),
  ]);

  const offerCardsByOffer = groupBy(allOfferCards, (c) => c.offerId);
  const listingsById = new Map(allListings.map((l) => [l.id, l]));
  const listingCardsByListing = groupBy(allListingCards, (c) => c.listingId);

  return offers.map((offer) => {
    const listing = listingsById.get(offer.listingId);
    return {
      ...offer,
      cards: offerCardsByOffer.get(offer.id) ?? [],
      listing: listing
        ? {
            ...listing,
            cards: listingCardsByListing.get(offer.listingId) ?? [],
          }
        : null,
    };
  });
}

export async function countActiveListings(sellerId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(marketListings)
    .where(
      and(
        eq(marketListings.sellerId, sellerId),
        eq(marketListings.status, "active")
      )
    );
  return row?.value ?? 0;
}

export async function countActiveOffers(buyerId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(marketOffers)
    .where(
      and(eq(marketOffers.buyerId, buyerId), eq(marketOffers.status, "pending"))
    );
  return row?.value ?? 0;
}

export function createMarketListing(data: typeof marketListings.$inferInsert) {
  return db.insert(marketListings).values(data).returning();
}

export function addMarketListingCards(listingId: number, cardIds: string[]) {
  return db
    .insert(marketListingCards)
    .values(cardIds.map((cardId) => ({ listingId, cardId })));
}

export function createMarketOffer(data: typeof marketOffers.$inferInsert) {
  return db.insert(marketOffers).values(data).returning();
}

export function addMarketOfferCards(offerId: number, cardIds: string[]) {
  return db
    .insert(marketOfferCards)
    .values(cardIds.map((cardId) => ({ offerId, cardId })));
}

export async function verifyCardOwnership(cardIds: string[], userId: string) {
  const owned = await db
    .select({ cardId: cardToTgUser.cardId, isLocked: cardToTgUser.isLocked })
    .from(cardToTgUser)
    .where(
      and(
        inArray(cardToTgUser.cardId, cardIds),
        eq(cardToTgUser.tgUserId, userId)
      )
    );
  return owned;
}

export async function getMarketOffer(offerId: number) {
  const [offer] = await db
    .select()
    .from(marketOffers)
    .where(eq(marketOffers.id, offerId));
  return offer ?? null;
}

export type CardValidationResult =
  | { ok: true; cardIds: string[] }
  | { ok: false; error: string; status: 400 | 403 };

export async function validateCardsForTrade(
  cardIds: string[],
  userId: string
): Promise<CardValidationResult> {
  const uniqueCardIds = [...new Set(cardIds)];
  if (uniqueCardIds.length !== cardIds.length) {
    return { ok: false, error: "Duplicate card IDs", status: 400 };
  }

  const owned = await verifyCardOwnership(uniqueCardIds, userId);

  const ownedCardIds = new Set(owned.map((c) => c.cardId));
  if (ownedCardIds.size !== uniqueCardIds.length) {
    return {
      ok: false,
      error: "You don't own all selected cards",
      status: 403,
    };
  }

  const cardIdsWithUnlockedCopy = new Set(
    owned.filter((c) => !c.isLocked).map((c) => c.cardId)
  );
  const lockedCardIds = uniqueCardIds.filter(
    (id) => !cardIdsWithUnlockedCopy.has(id)
  );
  if (lockedCardIds.length > 0) {
    return { ok: false, error: "Some cards are locked", status: 403 };
  }

  return { ok: true, cardIds: uniqueCardIds };
}

export async function getMarketListingCardIds(listingId: number) {
  return db
    .select({ cardId: marketListingCards.cardId })
    .from(marketListingCards)
    .where(eq(marketListingCards.listingId, listingId))
    .then((rows) => rows.map((r) => r.cardId));
}

export type ReservedCardIds = { listed: string[]; offered: string[] };

export async function getUserReservedCardIds(
  userId: string
): Promise<ReservedCardIds> {
  const [listed, offered] = await Promise.all([
    db
      .selectDistinct({ cardId: marketListingCards.cardId })
      .from(marketListingCards)
      .innerJoin(
        marketListings,
        eq(marketListings.id, marketListingCards.listingId)
      )
      .where(
        and(
          eq(marketListings.sellerId, userId),
          eq(marketListings.status, "active")
        )
      ),
    db
      .selectDistinct({ cardId: marketOfferCards.cardId })
      .from(marketOfferCards)
      .innerJoin(marketOffers, eq(marketOffers.id, marketOfferCards.offerId))
      .where(
        and(
          eq(marketOffers.buyerId, userId),
          eq(marketOffers.status, "pending")
        )
      ),
  ]);

  return {
    listed: listed.map((r) => r.cardId),
    offered: offered.map((r) => r.cardId),
  };
}
