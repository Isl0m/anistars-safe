import {
  and,
  desc,
  eq,
  getTableColumns,
  inArray,
} from "drizzle-orm";

import { db } from "@/db";
import { cardToTgUser, tCards } from "@/db/schema/card";
import {
  marketListingCards,
  marketListings,
  MarketListingStatus,
  marketOfferCards,
  marketOffers,
  MarketOfferStatus,
} from "@/db/schema/market";
import { tgUsers } from "@/db/schema/user";
import { cardBaseColumns } from "./shared";

export async function getMarketListings() {
  const listingColumns = getTableColumns(marketListings);
  const sellerColumns = getTableColumns(tgUsers);

  const listings = await db
    .select({
      ...listingColumns,
      seller: sellerColumns,
    })
    .from(marketListings)
    .where(eq(marketListings.status, "active"))
    .innerJoin(tgUsers, eq(marketListings.sellerId, tgUsers.id))
    .orderBy(desc(marketListings.createdAt));

  if (listings.length === 0) return [];

  const allCards = await db
    .select({
      listingId: marketListingCards.listingId,
      ...cardBaseColumns,
    })
    .from(marketListingCards)
    .where(
      inArray(
        marketListingCards.listingId,
        listings.map((l) => l.id)
      )
    )
    .innerJoin(tCards, eq(tCards.id, marketListingCards.cardId));

  const cardsByListing = Map.groupBy(allCards, (c) => c.listingId);

  return listings.map((listing) => ({
    ...listing,
    cards: cardsByListing.get(listing.id) ?? [],
  }));
}

export async function getMarketListing(id: number) {
  const listingColumns = getTableColumns(marketListings);
  const sellerColumns = getTableColumns(tgUsers);

  const listing = await db
    .select({
      ...listingColumns,
      seller: sellerColumns,
    })
    .from(marketListings)
    .where(eq(marketListings.id, id))
    .innerJoin(tgUsers, eq(marketListings.sellerId, tgUsers.id))
    .then((res) => res[0]);

  if (!listing) return null;

  const cards = await db
    .select(cardBaseColumns)
    .from(marketListingCards)
    .where(eq(marketListingCards.listingId, id))
    .innerJoin(tCards, eq(tCards.id, marketListingCards.cardId));

  return {
    ...listing,
    cards,
  };
}

export async function getUserMarketListings(userId: string) {
  const listingColumns = getTableColumns(marketListings);
  const sellerColumns = getTableColumns(tgUsers);

  const listings = await db
    .select({
      ...listingColumns,
      seller: sellerColumns,
    })
    .from(marketListings)
    .where(eq(marketListings.sellerId, userId))
    .innerJoin(tgUsers, eq(marketListings.sellerId, tgUsers.id))
    .orderBy(desc(marketListings.createdAt));

  if (listings.length === 0) return [];

  const allCards = await db
    .select({
      listingId: marketListingCards.listingId,
      ...cardBaseColumns,
    })
    .from(marketListingCards)
    .where(
      inArray(
        marketListingCards.listingId,
        listings.map((l) => l.id)
      )
    )
    .innerJoin(tCards, eq(tCards.id, marketListingCards.cardId));

  const cardsByListing = Map.groupBy(allCards, (c) => c.listingId);

  return listings.map((listing) => ({
    ...listing,
    cards: cardsByListing.get(listing.id) ?? [],
  }));
}

export async function getMarketOffersForListing(listingId: number) {
  const offerColumns = getTableColumns(marketOffers);
  const buyerColumns = getTableColumns(tgUsers);

  const offers = await db
    .select({
      ...offerColumns,
      buyer: buyerColumns,
    })
    .from(marketOffers)
    .where(eq(marketOffers.listingId, listingId))
    .innerJoin(tgUsers, eq(marketOffers.buyerId, tgUsers.id))
    .orderBy(desc(marketOffers.createdAt));

  if (offers.length === 0) return [];

  const allCards = await db
    .select({
      offerId: marketOfferCards.offerId,
      ...cardBaseColumns,
    })
    .from(marketOfferCards)
    .where(
      inArray(
        marketOfferCards.offerId,
        offers.map((o) => o.id)
      )
    )
    .innerJoin(tCards, eq(tCards.id, marketOfferCards.cardId));

  const cardsByOffer = Map.groupBy(allCards, (c) => c.offerId);

  return offers.map((offer) => ({
    ...offer,
    cards: cardsByOffer.get(offer.id) ?? [],
  }));
}

export async function getUserMarketOffers(userId: string) {
  const offerColumns = getTableColumns(marketOffers);
  const buyerColumns = getTableColumns(tgUsers);

  const offers = await db
    .select({
      ...offerColumns,
      buyer: buyerColumns,
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
        ...cardBaseColumns,
      })
      .from(marketOfferCards)
      .where(inArray(marketOfferCards.offerId, offerIds))
      .innerJoin(tCards, eq(tCards.id, marketOfferCards.cardId)),

    db
      .select({
        ...getTableColumns(marketListings),
        seller: getTableColumns(tgUsers),
      })
      .from(marketListings)
      .where(inArray(marketListings.id, listingIds))
      .innerJoin(tgUsers, eq(marketListings.sellerId, tgUsers.id)),

    db
      .select({
        listingId: marketListingCards.listingId,
        ...cardBaseColumns,
      })
      .from(marketListingCards)
      .where(inArray(marketListingCards.listingId, listingIds))
      .innerJoin(tCards, eq(tCards.id, marketListingCards.cardId)),
  ]);

  const offerCardsByOffer = Map.groupBy(allOfferCards, (c) => c.offerId);
  const listingsById = new Map(allListings.map((l) => [l.id, l]));
  const listingCardsByListing = Map.groupBy(
    allListingCards,
    (c) => c.listingId
  );

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

export async function validateCardsForTrade(cardIds: string[], userId: string) {
  const uniqueCardIds = [...new Set(cardIds)];
  if (uniqueCardIds.length !== cardIds.length) {
    return { error: "Duplicate card IDs", status: 400 as const };
  }

  const owned = await verifyCardOwnership(uniqueCardIds, userId);
  if (owned.length !== uniqueCardIds.length) {
    return { error: "You don't own all selected cards", status: 403 as const };
  }

  const lockedCards = owned.filter((c) => c.isLocked);
  if (lockedCards.length > 0) {
    return { error: "Some cards are locked", status: 403 as const };
  }

  return { cardIds: uniqueCardIds };
}

export function updateMarketOfferStatus(
  offerId: number,
  status: MarketOfferStatus
) {
  return db
    .update(marketOffers)
    .set({ status })
    .where(eq(marketOffers.id, offerId));
}

export function updateMarketListingStatus(
  listingId: number,
  status: MarketListingStatus
) {
  return db
    .update(marketListings)
    .set({ status })
    .where(eq(marketListings.id, listingId));
}

export async function cancelPendingOffersForListing(listingId: number) {
  return db
    .update(marketOffers)
    .set({ status: "cancelled" as MarketOfferStatus })
    .where(
      and(
        eq(marketOffers.listingId, listingId),
        eq(marketOffers.status, "pending")
      )
    );
}
