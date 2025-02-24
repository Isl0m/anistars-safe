import {
  aliasedTable,
  and,
  desc,
  eq,
  getTableColumns,
  notInArray,
} from "drizzle-orm";

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
import {
  InsertMultiTrade,
  multiTradeCards,
  multiTrades,
  SelectMultiTrade,
} from "@/db/schema/trade";
import { tgUsers } from "@/db/schema/user";

export async function getRarities() {
  return db.select().from(tRarities).orderBy(tRarities.chance);
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
    })
    .from(cardToTgUser)
    .innerJoin(tCards, eq(tCards.id, cardToTgUser.cardId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .where(eq(cardToTgUser.tgUserId, userId))
    .groupBy(tUniverses.id, tUniverses.name);
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

export async function getUserCardsDifference(id: string, secondId: string) {
  const cardBase = getTableColumns(tCards);
  const techniqueColums = getTableColumns(tTechniques);

  const secondUserCards = await db
    .select({ cardId: cardToTgUser.cardId })
    .from(cardToTgUser)
    .innerJoin(tCards, eq(tCards.id, cardToTgUser.cardId))
    .where(eq(cardToTgUser.tgUserId, secondId));

  const secondUserCardIds = secondUserCards.map((c) => c.cardId);

  if (secondUserCardIds.length > 0) {
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
      .innerJoin(tCards, eq(tCards.id, cardToTgUser.cardId))
      .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
      .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
      .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
      .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
      .leftJoin(tTechniques, eq(tTechniques.id, tCards.techniqueId))
      .where(
        and(
          notInArray(tCards.id, secondUserCardIds),
          eq(cardToTgUser.tgUserId, id)
        )
      )
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
      .from(cardToTgUser)
      .innerJoin(tCards, eq(tCards.id, cardToTgUser.cardId))
      .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
      .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
      .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
      .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
      .leftJoin(tTechniques, eq(tTechniques.id, tCards.techniqueId))
      .where(eq(cardToTgUser.tgUserId, id))
      .orderBy(desc(tCards.power), desc(tCards.stamina));
  }
}

export async function getTradeWithSenderCards(id: number) {
  const multiTradeColumns = getTableColumns(multiTrades);
  const trade = await db
    .select({
      ...multiTradeColumns,
      senderName: tgUsers.name,
    })
    .from(multiTrades)
    .where(eq(multiTrades.id, id))
    .innerJoin(tgUsers, eq(multiTrades.senderId, tgUsers.id))
    .then((res) => res[0]);
  if (!trade) return;

  const cardBase = getTableColumns(tCards);
  const techniqueColums = getTableColumns(tTechniques);
  const cards = await db
    .select({
      ...cardBase,
      rarity: tRarities.name,
      universe: tUniverses.name,
      class: tClasses.name,
      author: tAuthors.username,
      technique: techniqueColums,
    })
    .from(multiTradeCards)
    .where(
      and(
        eq(multiTradeCards.tradeId, id),
        eq(multiTradeCards.isSenderCard, true)
      )
    )
    .innerJoin(tCards, eq(tCards.id, multiTradeCards.cardId))
    .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
    .leftJoin(tTechniques, eq(tTechniques.id, tCards.techniqueId));

  return { ...trade, senderCards: cards };
}

export async function getTradeFull(id: number) {
  const multiTradeColumns = getTableColumns(multiTrades);
  const sender = aliasedTable(tgUsers, "sender");
  const receiver = aliasedTable(tgUsers, "receiver");

  const trade = await db
    .select({
      ...multiTradeColumns,
      senderName: sender.name,
      receiverName: receiver.name,
    })
    .from(multiTrades)
    .where(eq(multiTrades.id, id))
    .innerJoin(sender, eq(multiTrades.senderId, sender.id))
    .innerJoin(receiver, eq(multiTrades.receiverId, receiver.id))
    .then((res) => res[0]);
  if (!trade) return;

  const cardBase = getTableColumns(tCards);
  const techniqueColums = getTableColumns(tTechniques);
  const senderCards = await db
    .select({
      ...cardBase,
      rarity: tRarities.name,
      universe: tUniverses.name,
      class: tClasses.name,
      author: tAuthors.username,
      technique: techniqueColums,
    })
    .from(multiTradeCards)
    .where(
      and(
        eq(multiTradeCards.tradeId, id),
        eq(multiTradeCards.isSenderCard, true)
      )
    )
    .innerJoin(tCards, eq(tCards.id, multiTradeCards.cardId))
    .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
    .leftJoin(tTechniques, eq(tTechniques.id, tCards.techniqueId));

  const receiverCards = await db
    .select({
      ...cardBase,
      rarity: tRarities.name,
      universe: tUniverses.name,
      class: tClasses.name,
      author: tAuthors.username,
      technique: techniqueColums,
    })
    .from(multiTradeCards)
    .where(
      and(
        eq(multiTradeCards.tradeId, id),
        eq(multiTradeCards.isSenderCard, false)
      )
    )
    .innerJoin(tCards, eq(tCards.id, multiTradeCards.cardId))
    .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
    .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
    .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
    .leftJoin(tTechniques, eq(tTechniques.id, tCards.techniqueId));

  return { ...trade, senderCards, receiverCards };
}

export function createTrade(data: InsertMultiTrade) {
  return db.insert(multiTrades).values(data).returning();
}

export function updateTrade(id: number, data: Partial<SelectMultiTrade>) {
  return db
    .update(multiTrades)
    .set(data)
    .where(eq(multiTrades.id, id))
    .returning();
}

export function removeTrade(id: number) {
  return db.delete(multiTrades).where(eq(multiTrades.id, id)).returning();
}

export function addTradeCards(
  tradeId: number,
  cardIds: string[],
  isSenderCard: boolean
) {
  return db
    .insert(multiTradeCards)
    .values(cardIds.map((cardId) => ({ tradeId, cardId, isSenderCard })));
}
