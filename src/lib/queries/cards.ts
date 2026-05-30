import {
  aliasedTable,
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  notExists,
  Param,
  sql,
  SQL,
} from "drizzle-orm";

import { Filter } from "@/components/get-filter-options";
import { db } from "@/db";
import { tAuthors } from "@/db/schema/author";
import {
  Card,
  cardToTgUser,
  cardUpgradePaths,
  FullCard,
  tCards,
  tClasses,
  tRarities,
  tUniverses,
} from "@/db/schema/card";
import { trialTowerRewards } from "@/db/schema/trialTower";
import { cardDetailColumns, techniquesSql } from "./shared";

export async function getRarities() {
  return db.select().from(tRarities).orderBy(tRarities.chance);
}

export type TrialTowerRewardWithCard = Awaited<
  ReturnType<typeof getTrialTowerRewards>
>[number];

export async function getTrialTowerRewards() {
  return db
    .select({
      id: trialTowerRewards.id,
      cardId: trialTowerRewards.cardId,
      stock: trialTowerRewards.stock,
      initialStock: trialTowerRewards.initialStock,
      pool: trialTowerRewards.pool,
      card: {
        name: tCards.name,
        image: tCards.image,
        rarity: tRarities.name,
        price: tCards.price,
      },
    })
    .from(trialTowerRewards)
    .innerJoin(tCards, eq(trialTowerRewards.cardId, tCards.id))
    .innerJoin(tRarities, eq(tCards.rarityId, tRarities.id))
    .orderBy(desc(tCards.price));
}

export async function getClasses() {
  return db.select().from(tClasses).orderBy(tClasses.id);
}

export async function getUniverses() {
  return db.select().from(tUniverses);
}

export async function getUserUniverses(userId: string) {
  return db
    .select({
      id: tUniverses.id,
      name: tUniverses.name,
      type: tUniverses.type,
    })
    .from(cardToTgUser)
    .innerJoin(tCards, eq(tCards.id, cardToTgUser.cardId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .where(eq(cardToTgUser.tgUserId, userId))
    .groupBy(tUniverses.id, tUniverses.name, tUniverses.type);
}

export async function getCardsFullWithFilter(
  filter?: Filter
): Promise<FullCard[]> {
  const { filters, order } = getSQLFilters(filter);

  return db
    .select({
      ...cardDetailColumns,
      techniques: techniquesSql,
    })
    .from(tCards)
    .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
    .where(and(...filters))
    .orderBy(order);
}

export async function getAuthors() {
  return db.select().from(tAuthors);
}

export async function getUserCardsWithFilter(id: string, filter?: Filter) {
  const { filters, order } = getSQLFilters(filter);

  return db
    .select({
      ...cardDetailColumns,
      techniques: techniquesSql,
    })
    .from(cardToTgUser)
    .innerJoin(tCards, eq(cardToTgUser.cardId, tCards.id))
    .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
    .where(and(eq(cardToTgUser.tgUserId, id), ...filters))
    .orderBy(order);
}

export async function getUserMissingCardsWithFilter(
  id: string,
  filter?: Filter
) {
  const { filters, order } = getSQLFilters(filter);

  return db
    .select({
      ...cardDetailColumns,
      techniques: techniquesSql,
    })
    .from(tCards)
    .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
    .where(
      and(
        notExists(
          db
            .select()
            .from(cardToTgUser)
            .where(
              and(
                eq(cardToTgUser.tgUserId, id),
                eq(cardToTgUser.cardId, tCards.id)
              )
            )
        ),
        ...filters
      )
    )
    .orderBy(order);
}

function getSQLFilters(filter?: Filter) {
  const filters: (SQL | undefined)[] = [];
  if (filter?.rarityIds && filter.rarityIds.length > 0)
    filters.push(inArray(tCards.rarityId, filter.rarityIds));
  if (filter?.classIds && filter.classIds.length > 0)
    filters.push(inArray(tCards.classId, filter.classIds));
  if (filter?.universeIds && filter.universeIds.length > 0)
    filters.push(inArray(tCards.universeId, filter.universeIds));
  if (filter?.authorIds && filter.authorIds.length > 0)
    filters.push(inArray(tCards.authorId, filter.authorIds));
  if (filter?.stats && filter.stats.length > 0)
    filters.push(inArray(tCards.stats, filter.stats));

  if (filter?.minPrice) {
    filters.push(gte(tCards.price, filter.minPrice));
  }

  if (filter?.droppable && filter.droppable.length > 0) {
    filter.droppable.forEach((f) => {
      if (f === "limited") {
        filters.push(eq(tCards.droppable, false));
      }
      if (f === "basic") {
        filters.push(eq(tCards.droppable, true));
      }
      if (f === "upgradable") {
        filters.push(eq(tCards.upgradeable, true));
      }
      if (f === "upgrade") {
        filters.push(eq(tCards.upgrade, true));
      }
    });
  }

  if (filter?.techniques && filter.techniques.length > 0) {
    filters.push(sql`EXISTS (
          SELECT 1
          FROM "Technique" t
          WHERE t.id = ANY(${tCards.techniqueIds})
            AND t."type" = ANY(${new Param(filter.techniques)})
        )`);
  }

  let order: SQL = desc(sql`${tCards.power} + ${tCards.stamina} / 2`);
  switch (filter?.sort) {
    case "power-desc":
      order = desc(sql`${tCards.power} + ${tCards.stamina} / 2`);
      break;
    case "power-asc":
      order = asc(sql`${tCards.power} + ${tCards.stamina} / 2`);
      break;
    case "createdAt-asc":
      order = asc(tCards.createdAt);
      break;
    case "createdAt-desc":
      order = desc(tCards.createdAt);
      break;
    case "price-asc":
      order = asc(tCards.price);
      break;
    case "price-desc":
      order = desc(tCards.price);
      break;
    case "quantity-asc":
      order = asc(tCards.quantity);
      break;
    case "quantity-desc":
      order = desc(tCards.quantity);
      break;
  }

  return {
    filters,
    order,
  };
}

export async function getUserCardsDifferenceWithFilter(
  id: string,
  secondId: string,
  filter?: Filter
) {
  const { filters, order } = getSQLFilters(filter);
  const secondUserCard = aliasedTable(cardToTgUser, "secondUserCard");

  return db
    .select({
      ...cardDetailColumns,
      techniques: techniquesSql,
    })
    .from(cardToTgUser)
    .innerJoin(tCards, eq(tCards.id, cardToTgUser.cardId))
    .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
    .where(
      and(
        ...filters,
        notExists(
          db
            .select()
            .from(secondUserCard)
            .where(
              and(
                eq(secondUserCard.tgUserId, secondId),
                eq(secondUserCard.cardId, tCards.id)
              )
            )
        ),
        eq(cardToTgUser.tgUserId, id)
      )
    )
    .orderBy(order);
}

export async function getUserCollection(id: string, filter?: Filter) {
  return db
    .select({
      id: tUniverses.id,
      name: tUniverses.name,
      totalCards: count(tCards.id).as("totalCards"),
      userCards: count(cardToTgUser.cardId).as("userCards"),
      percentage:
        sql<number>`ROUND((${count(cardToTgUser.cardId)} * 100.0) / NULLIF(${count(tCards.id)}, 0))`
          .mapWith(Number)
          .as("percentage"),
    })
    .from(tUniverses)
    .innerJoin(tCards, eq(tCards.universeId, tUniverses.id))
    .leftJoin(
      cardToTgUser,
      and(eq(cardToTgUser.cardId, tCards.id), eq(cardToTgUser.tgUserId, id))
    )
    .groupBy(tUniverses.id, tUniverses.name)
    .orderBy(sql`percentage DESC`);
}

export type CardUpgrades = {
  id: string;
  name: string;
  baseImage: string;
  image1: string;
  image2: string | null;
};

export async function getCardUpgrades() {
  const c1 = aliasedTable(tCards, "c1");
  const c2 = aliasedTable(tCards, "c2");
  const c3 = aliasedTable(tCards, "c3");
  const up2 = aliasedTable(cardUpgradePaths, "up2");

  return db
    .select({
      id: c1.id,
      name: c1.name,
      baseImage: c1.image,
      image1: c2.image,
      image2: c3.image,
    })
    .from(cardUpgradePaths)
    .innerJoin(c1, eq(cardUpgradePaths.fromCardId, c1.id))
    .innerJoin(c2, eq(cardUpgradePaths.toCardId, c2.id))
    .leftJoin(up2, eq(c2.id, up2.fromCardId))
    .leftJoin(c3, eq(up2.toCardId, c3.id))
    .where(
      notExists(
        db
          .select()
          .from(cardUpgradePaths)
          .where(eq(cardUpgradePaths.toCardId, c1.id))
      )
    )
    .orderBy(cardUpgradePaths.createdAt);
}

export const MAX_FAVOURITE_CARDS = 8;

export async function getUserFavouriteCards(userId: string): Promise<FullCard[]> {
  return db
    .select({
      ...cardDetailColumns,
      techniques: techniquesSql,
    })
    .from(cardToTgUser)
    .innerJoin(tCards, eq(cardToTgUser.cardId, tCards.id))
    .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
    .where(
      and(
        eq(cardToTgUser.tgUserId, userId),
        isNotNull(cardToTgUser.favouritePosition)
      )
    )
    .orderBy(asc(cardToTgUser.favouritePosition));
}

export async function getUserFavouriteCardIds(userId: string) {
  return db
    .select({ cardId: cardToTgUser.cardId })
    .from(cardToTgUser)
    .where(
      and(
        eq(cardToTgUser.tgUserId, userId),
        isNotNull(cardToTgUser.favouritePosition)
      )
    )
    .orderBy(asc(cardToTgUser.favouritePosition))
    .then((rows) => rows.map((r) => r.cardId));
}

export async function addFavouriteCard(userId: string, cardId: string) {
  const row = await db
    .select({
      cardId: cardToTgUser.cardId,
      favouritePosition: cardToTgUser.favouritePosition,
    })
    .from(cardToTgUser)
    .where(
      and(eq(cardToTgUser.tgUserId, userId), eq(cardToTgUser.cardId, cardId))
    )
    .then((res) => res[0] ?? null);

  if (!row) {
    return { error: "not_owned" as const };
  }

  if (row.favouritePosition !== null) {
    return { error: "already_exists" as const };
  }

  const favCount = await db
    .select({ count: count() })
    .from(cardToTgUser)
    .where(
      and(
        eq(cardToTgUser.tgUserId, userId),
        isNotNull(cardToTgUser.favouritePosition)
      )
    )
    .then((res) => res[0]?.count ?? 0);

  if (favCount >= MAX_FAVOURITE_CARDS) {
    return { error: "max_reached" as const };
  }

  await db
    .update(cardToTgUser)
    .set({ favouritePosition: favCount })
    .where(
      and(eq(cardToTgUser.tgUserId, userId), eq(cardToTgUser.cardId, cardId))
    );

  return { success: true };
}

export async function removeFavouriteCard(userId: string, cardId: string) {
  await db
    .update(cardToTgUser)
    .set({ favouritePosition: null })
    .where(
      and(
        eq(cardToTgUser.tgUserId, userId),
        eq(cardToTgUser.cardId, cardId)
      )
    );
  return { success: true };
}

export async function reorderFavouriteCards(userId: string, cardIds: string[]) {
  if (cardIds.length > MAX_FAVOURITE_CARDS) {
    return { error: "max_reached" as const };
  }

  await db
    .update(cardToTgUser)
    .set({ favouritePosition: null })
    .where(
      and(
        eq(cardToTgUser.tgUserId, userId),
        isNotNull(cardToTgUser.favouritePosition)
      )
    );

  for (let i = 0; i < cardIds.length; i++) {
    await db
      .update(cardToTgUser)
      .set({ favouritePosition: i })
      .where(
        and(
          eq(cardToTgUser.tgUserId, userId),
          eq(cardToTgUser.cardId, cardIds[i])
        )
      );
  }

  return { success: true };
}

export async function getUniverseData(userId: string, universeId: number) {
  const stats = await db
    .select({
      totalInUniverse: count(tCards.id),
      totalOwnedByUser: count(cardToTgUser.cardId),
      universe: tUniverses.name,
    })
    .from(tCards)
    .innerJoin(
      tUniverses,
      and(eq(tCards.universeId, tUniverses.id), eq(tUniverses.id, universeId))
    )
    .leftJoin(
      cardToTgUser,
      and(eq(cardToTgUser.cardId, tCards.id), eq(cardToTgUser.tgUserId, userId))
    )
    .where(eq(tCards.universeId, universeId))
    .groupBy(tUniverses.name)
    .then((res) => res[0]);

  const cardsRaw = await db
    .select({
      card: tCards,
      rarity: tRarities,
      isOwned:
        sql<boolean>`CASE WHEN ${cardToTgUser.cardId} IS NOT NULL THEN TRUE ELSE FALSE END`.mapWith(
          Boolean
        ),
    })
    .from(tCards)
    .innerJoin(tRarities, eq(tCards.rarityId, tRarities.id))
    .leftJoin(
      cardToTgUser,
      and(eq(cardToTgUser.cardId, tCards.id), eq(cardToTgUser.tgUserId, userId))
    )
    .where(eq(tCards.universeId, universeId))
    .orderBy(desc(tRarities.rank), desc(tCards.price));

  const cardsByRarity = cardsRaw.reduce(
    (acc, row) => {
      const rarityName = row.rarity.name;
      if (!acc[rarityName]) acc[rarityName] = [];
      acc[rarityName].push({ ...row.card, isOwned: row.isOwned });
      return acc;
    },
    {} as Record<string, (Card & { isOwned: boolean })[]>
  );

  return {
    stats,
    cardsByRarity,
  };
}
