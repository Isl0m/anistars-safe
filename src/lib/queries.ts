import {
  aliasedTable,
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  notExists,
  notInArray,
  or,
  Param,
  sql,
  SQL,
} from "drizzle-orm";

import { Filter } from "@/components/get-filte-options";
import { db } from "@/db";
import { tAuthors } from "@/db/schema/author";
import { banners, userBanners } from "@/db/schema/banner";
import {
  Card,
  cardToTgUser,
  cardUpgradePaths,
  FullCard,
  tCards,
  tClasses,
  Technique,
  tRarities,
  tTechniques,
  tUniverses,
} from "@/db/schema/card";
import {
  InsertMultiTrade,
  multiTradeCards,
  multiTrades,
  SelectMultiTrade,
  tradeLogs,
} from "@/db/schema/trade";
import { tgUsers, User, userPasses } from "@/db/schema/user";

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

export async function getCardsFullWithFilter(
  filter?: Filter
): Promise<FullCard[]> {
  const { filters, order } = getSQLFilters(filter);
  const cardBase = getTableColumns(tCards);

  return db
    .select({
      ...cardBase,
      rarity: tRarities.name,
      universe: tUniverses.name,
      class: tClasses.name,
      author: tAuthors.username,
      techniques: sql<Technique[]>`COALESCE(
              (
                SELECT json_agg(t)
                FROM unnest(${tCards.techniqueIds}) AS tid
                JOIN ${tTechniques} t ON t.id = tid
              ),
              '[]'::json
            )`,
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

export async function getUser(id: string) {
  const userColumns = getTableColumns(tgUsers);
  return db
    .select({
      ...userColumns,
      isPremium: userPasses.isPremium || false,
    })
    .from(tgUsers)
    .where(eq(tgUsers.id, id))
    .leftJoin(userPasses, eq(userPasses.id, tgUsers.id))
    .then((res) => res[0] ?? null);
}

export async function getUserCardsWithFilter(id: string, filter?: Filter) {
  const { filters, order } = getSQLFilters(filter);
  const cardBase = getTableColumns(tCards);

  return db
    .select({
      ...cardBase,
      rarity: tRarities.name,
      universe: tUniverses.name,
      class: tClasses.name,
      author: tAuthors.username,
      techniques: sql<Technique[]>`COALESCE(
              (
                SELECT json_agg(t)
                FROM unnest(${tCards.techniqueIds}) AS tid
                JOIN ${tTechniques} t ON t.id = tid
              ),
              '[]'::json
            )`,
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
  const cardBase = getTableColumns(tCards);

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
        techniques: sql<Technique[]>`COALESCE(
                      (
                        SELECT json_agg(t)
                        FROM unnest(${tCards.techniqueIds}) AS tid
                        JOIN ${tTechniques} t ON t.id = tid
                      ),
                      '[]'::json
                    )`,
      })
      .from(tCards)
      .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
      .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
      .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
      .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
      .where(and(notInArray(tCards.id, userCardIds), ...filters))
      .orderBy(order);
  } else {
    return db
      .select({
        ...cardBase,
        rarity: tRarities.name,
        universe: tUniverses.name,
        class: tClasses.name,
        author: tAuthors.username,
        techniques: sql<Technique[]>`COALESCE(
                      (
                        SELECT json_agg(t)
                        FROM unnest(${tCards.techniqueIds}) AS tid
                        JOIN ${tTechniques} t ON t.id = tid
                      ),
                      '[]'::json
                    )`,
      })
      .from(tCards)
      .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
      .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
      .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
      .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
      .where(and(...filters))
      .orderBy(order);
  }
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

  let order: SQL = desc(tCards.createdAt);
  switch (filter?.sort) {
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
  const cardBase = getTableColumns(tCards);

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
        techniques: sql<Technique[]>`COALESCE(
                      (
                        SELECT json_agg(t)
                        FROM unnest(${tCards.techniqueIds}) AS tid
                        JOIN ${tTechniques} t ON t.id = tid
                      ),
                      '[]'::json
                    )`,
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
          notInArray(tCards.id, secondUserCardIds),
          eq(cardToTgUser.tgUserId, id)
        )
      )
      .orderBy(order);
  } else {
    return db
      .select({
        ...cardBase,
        rarity: tRarities.name,
        universe: tUniverses.name,
        class: tClasses.name,
        author: tAuthors.username,
        techniques: sql<Technique[]>`COALESCE(
                      (
                        SELECT json_agg(t)
                        FROM unnest(${tCards.techniqueIds}) AS tid
                        JOIN ${tTechniques} t ON t.id = tid
                      ),
                      '[]'::json
                    )`,
      })
      .from(cardToTgUser)
      .innerJoin(tCards, eq(tCards.id, cardToTgUser.cardId))
      .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId))
      .innerJoin(tUniverses, eq(tUniverses.id, tCards.universeId))
      .innerJoin(tClasses, eq(tClasses.id, tCards.classId))
      .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId))
      .where(and(...filters, eq(cardToTgUser.tgUserId, id)))
      .orderBy(order);
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
  const cards = await db
    .select({
      ...cardBase,
      rarity: tRarities.name,
      universe: tUniverses.name,
      class: tClasses.name,
      author: tAuthors.username,
      techniques: sql<Technique[]>`COALESCE(
                    (
                      SELECT json_agg(t)
                      FROM unnest(${tCards.techniqueIds}) AS tid
                      JOIN ${tTechniques} t ON t.id = tid
                    ),
                    '[]'::json
                  )`,
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
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId));

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
  const senderCards = await db
    .select({
      ...cardBase,
      rarity: tRarities.name,
      universe: tUniverses.name,
      class: tClasses.name,
      author: tAuthors.username,
      techniques: sql<Technique[]>`COALESCE(
                    (
                      SELECT json_agg(t)
                      FROM unnest(${tCards.techniqueIds}) AS tid
                      JOIN ${tTechniques} t ON t.id = tid
                    ),
                    '[]'::json
                  )`,
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
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId));

  const receiverCards = await db
    .select({
      ...cardBase,
      rarity: tRarities.name,
      universe: tUniverses.name,
      class: tClasses.name,
      author: tAuthors.username,
      techniques: sql<Technique[]>`COALESCE(
                    (
                      SELECT json_agg(t)
                      FROM unnest(${tCards.techniqueIds}) AS tid
                      JOIN ${tTechniques} t ON t.id = tid
                    ),
                    '[]'::json
                  )`,
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
    .innerJoin(tAuthors, eq(tAuthors.id, tCards.authorId));

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

export type TradeHistory = {
  id: number;
  sender: User;
  receiver: User;
  senderCards: Card[];
  receiverCards: Card[];
  createdAt: Date;
  cost: number;
};
async function getMultiTradeUserHistory(id: string) {
  const cardColumns = getTableColumns(tCards);
  const sender = aliasedTable(tgUsers, "sender");
  const receiver = aliasedTable(tgUsers, "receiver");

  const senderColumns = getTableColumns(sender);
  const receiverColumns = getTableColumns(receiver);

  const trades = await db
    .select({
      id: multiTrades.id,
      sender: senderColumns,
      receiver: receiverColumns,
      card: cardColumns,
      isSenderCard: multiTradeCards.isSenderCard,
      createdAt: multiTrades.createdAt,
      cost: multiTrades.cost,
    })
    .from(multiTrades)
    .innerJoin(sender, eq(multiTrades.senderId, sender.id))
    .innerJoin(receiver, eq(multiTrades.receiverId, receiver.id))
    .innerJoin(multiTradeCards, eq(multiTradeCards.tradeId, multiTrades.id))
    .innerJoin(tCards, eq(tCards.id, multiTradeCards.cardId))
    .where(
      and(
        or(eq(multiTrades.senderId, id), eq(multiTrades.receiverId, id)),
        eq(multiTrades.status, "completed")
      )
    );

  const tradesHistory = trades.reduce<TradeHistory[]>((acc, trade) => {
    let existingTrade = acc.find((t) => t.id === trade.id);
    if (!existingTrade) {
      existingTrade = {
        id: trade.id,
        sender: trade.sender,
        receiver: trade.receiver,
        senderCards: [],
        receiverCards: [],
        createdAt: trade.createdAt!,
        cost: trade.cost,
      };
      acc.push(existingTrade);
    }

    if (trade.card) {
      const card = trade.card;
      if (trade.isSenderCard) {
        existingTrade.senderCards.push(card);
      } else {
        existingTrade.receiverCards.push(card);
      }
    }

    return acc;
  }, []);

  return tradesHistory;
}

async function getSingleTradeUserHistory(id: string) {
  const fromUser = aliasedTable(tgUsers, "fromUser");
  const toUser = aliasedTable(tgUsers, "toUser");
  const fromCard = aliasedTable(tCards, "fromCard");
  const toCard = aliasedTable(tCards, "toCard");

  const fromUserColumns = getTableColumns(fromUser);
  const toUserColumns = getTableColumns(toUser);
  const fromCardColumns = getTableColumns(fromCard);
  const toCardColumns = getTableColumns(toCard);

  const trades = await db
    .select({
      id: tradeLogs.id,
      fromUser: fromUserColumns,
      toUser: toUserColumns,
      fromCard: fromCardColumns,
      toCard: toCardColumns,
      cost: tradeLogs.cost,
      createdAt: tradeLogs.createdAt,
    })
    .from(tradeLogs)
    .innerJoin(fromUser, eq(fromUser.id, tradeLogs.fromUserId))
    .innerJoin(toUser, eq(toUser.id, tradeLogs.toUserId))
    .innerJoin(fromCard, eq(fromCard.id, tradeLogs.fromCardId))
    .innerJoin(toCard, eq(toCard.id, tradeLogs.toCardId))
    .where(or(eq(tradeLogs.fromUserId, id), eq(tradeLogs.toUserId, id)));

  const tradesHistory: TradeHistory[] = trades.map((trade) => ({
    id: trade.id,
    sender: trade.fromUser,
    receiver: trade.toUser,
    senderCards: [trade.fromCard],
    receiverCards: [trade.toCard],
    createdAt: trade.createdAt!,
    cost: trade.cost,
  }));

  return tradesHistory;
}

export async function userTradeHistory(userId: string) {
  const singleTrades = await getSingleTradeUserHistory(userId);
  const multiTrades = await getMultiTradeUserHistory(userId);
  return [...singleTrades, ...multiTrades].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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

export async function getBanners(userId?: string | null) {
  const bannerColumns = getTableColumns(banners);
  if (!userId) {
    return db
      .select({
        ...bannerColumns,
        isOwned: sql<boolean>`false`,
      })
      .from(banners)
      .where(eq(banners.isPrivate, false))
      .orderBy(banners.id);
  }
  return db
    .select({
      ...bannerColumns,
      isOwned: sql<boolean>`CASE WHEN ${userBanners.bannerId} IS NOT NULL THEN TRUE ELSE FALSE END`,
    })
    .from(banners)
    .leftJoin(
      userBanners,
      and(eq(banners.id, userBanners.bannerId), eq(userBanners.userId, userId))
    )
    .where(eq(banners.isPrivate, false));
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
