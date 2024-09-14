import { desc, eq, getTableColumns, notInArray } from "drizzle-orm";

import { db } from "@/db";
import { tAuthors } from "@/db/schema/author";
import {
  cardToTgUser,
  FullCard,
  tCards,
  tClasses,
  tRarities,
  tTechniques,
  tUniverses,
} from "@/db/schema/card";
import { tgUsers } from "@/db/schema/user";

export async function getRarities() {
  return db.select().from(tRarities).orderBy(tRarities.chance);
}

export async function getClasses() {
  return db.select().from(tClasses);
}

export async function getUniverses() {
  return db.select().from(tUniverses);
}

export async function getCards() {
  return db.select().from(tCards).orderBy(desc(tCards.createdAt));
}

export async function getCardsFull(): Promise<FullCard[]> {
  const cardBase = getTableColumns(tCards);
  const techniqueColums = getTableColumns(tTechniques);

  return db
    .select({
      ...cardBase,
      rarity: tRarities.name,
      universe: tUniverses.name,
      class: tClasses.name,
      author: tAuthors.username,
      technique: techniqueColums,
    })
    .from(tCards)
    .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
    .leftJoin(tTechniques, eq(tTechniques.id, tCards.techniqueId))
    .orderBy(desc(tCards.createdAt));
}

export async function getAuthors() {
  return db.select().from(tAuthors);
}

export async function getUser(id: string) {
  return db
    .select()
    .from(tgUsers)
    .where(eq(tgUsers.id, id))
    .then((res) => res[0] ?? null);
}

export async function getUserCards(id: string) {
  const cardBase = getTableColumns(tCards);
  const techniqueColums = getTableColumns(tTechniques);

  return db
    .select({
      ...cardBase,
      rarity: tRarities.name,
      universe: tUniverses.name,
      class: tClasses.name,
      author: tAuthors.username,
      technique: techniqueColums,
    })
    .from(cardToTgUser)
    .innerJoin(tCards, eq(cardToTgUser.cardId, tCards.id))
    .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
    .leftJoin(tTechniques, eq(tTechniques.id, tCards.techniqueId))
    .where(eq(cardToTgUser.tgUserId, id))
    .orderBy(desc(tCards.power), desc(tCards.stamina));
}

export async function getUserMissingCards(id: string) {
  const cardBase = getTableColumns(tCards);
  const techniqueColums = getTableColumns(tTechniques);

  const userCards = await db
    .select({ cardId: cardToTgUser.cardId })
    .from(cardToTgUser)
    .innerJoin(tCards, eq(tCards.id, cardToTgUser.cardId))
    .where(eq(cardToTgUser.tgUserId, id));

  const userCardIds = userCards.map((c) => c.cardId);

  if (userCardIds.length > 0) {
    return db
      .select({
        ...cardBase,
        rarity: tRarities.name,
        universe: tUniverses.name,
        class: tClasses.name,
        author: tAuthors.username,
        technique: techniqueColums,
      })
      .from(tCards)
      .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
      .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
      .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
      .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
      .leftJoin(tTechniques, eq(tTechniques.id, tCards.techniqueId))
      .where(notInArray(tCards.id, userCardIds))
      .orderBy(desc(tCards.power), desc(tCards.stamina));
  } else {
    return db
      .select({
        ...cardBase,
        rarity: tRarities.name,
        universe: tUniverses.name,
        class: tClasses.name,
        author: tAuthors.username,
        technique: techniqueColums,
      })
      .from(tCards)
      .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
      .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
      .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
      .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
      .leftJoin(tTechniques, eq(tTechniques.id, tCards.techniqueId))
      .orderBy(desc(tCards.power), desc(tCards.stamina));
  }
}
