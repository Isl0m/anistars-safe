import {
  aliasedTable,
  and,
  desc,
  eq,
  getTableColumns,
  inArray,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import { Card, tCards, tRarities } from "@/db/schema/card";
import {
  marketListingCards,
  marketListings,
  marketOfferCards,
  marketOffers,
} from "@/db/schema/market";
import {
  InsertMultiTrade,
  multiTradeCards,
  multiTrades,
  SelectMultiTrade,
  tradeLogs,
} from "@/db/schema/trade";
import { tgUsers, User } from "@/db/schema/user";

import { cardBaseColumns } from "./shared";

export async function getTradeWithSenderCards(id: number) {
  const multiTradeColumns = getTableColumns(multiTrades);
  const trade = await db
    .select({
      ...multiTradeColumns,
      senderName: tgUsers.name,
      senderPhotoUrl: tgUsers.photoUrl,
    })
    .from(multiTrades)
    .where(eq(multiTrades.id, id))
    .innerJoin(tgUsers, eq(multiTrades.senderId, tgUsers.id))
    .then((res) => res[0]);
  if (!trade) return;

  const cards = await db
    .select({
      ...cardBaseColumns,
      rarity: tRarities.name,
    })
    .from(multiTradeCards)
    .where(
      and(
        eq(multiTradeCards.tradeId, id),
        eq(multiTradeCards.isSenderCard, true)
      )
    )
    .innerJoin(tCards, eq(tCards.id, multiTradeCards.cardId))
    .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId));

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
      senderPhotoUrl: sender.photoUrl,
      receiverName: receiver.name,
      receiverPhotoUrl: receiver.photoUrl,
    })
    .from(multiTrades)
    .where(eq(multiTrades.id, id))
    .innerJoin(sender, eq(multiTrades.senderId, sender.id))
    .innerJoin(receiver, eq(multiTrades.receiverId, receiver.id))
    .then((res) => res[0]);
  if (!trade) return;

  const [senderCards, receiverCards] = await Promise.all([
    db
      .select({
        ...cardBaseColumns,
        rarity: tRarities.name,
      })
      .from(multiTradeCards)
      .where(
        and(
          eq(multiTradeCards.tradeId, id),
          eq(multiTradeCards.isSenderCard, true)
        )
      )
      .innerJoin(tCards, eq(tCards.id, multiTradeCards.cardId))
      .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId)),
    db
      .select({
        ...cardBaseColumns,
        rarity: tRarities.name,
      })
      .from(multiTradeCards)
      .where(
        and(
          eq(multiTradeCards.tradeId, id),
          eq(multiTradeCards.isSenderCard, false)
        )
      )
      .innerJoin(tCards, eq(tCards.id, multiTradeCards.cardId))
      .innerJoin(tRarities, eq(tRarities.id, tCards.rarityId)),
  ]);

  return { ...trade, senderCards, receiverCards };
}

export async function getTrade(id: number) {
  const [trade] = await db
    .select()
    .from(multiTrades)
    .where(eq(multiTrades.id, id));
  return trade ?? null;
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

export async function createTradeWithCards(
  data: InsertMultiTrade,
  cardIds: string[]
) {
  return db.transaction(async (tx) => {
    const [trade] = await tx.insert(multiTrades).values(data).returning();
    await tx
      .insert(multiTradeCards)
      .values(
        cardIds.map((cardId) => ({
          tradeId: trade.id,
          cardId,
          isSenderCard: true,
        }))
      );
    return trade;
  });
}

export async function fulfillTradeWithCards(
  id: number,
  cost: number,
  cardIds: string[]
) {
  return db.transaction(async (tx) => {
    const [trade] = await tx
      .update(multiTrades)
      .set({ cost, status: "fulfilled" })
      .where(eq(multiTrades.id, id))
      .returning();
    await tx
      .insert(multiTradeCards)
      .values(
        cardIds.map((cardId) => ({
          tradeId: id,
          cardId,
          isSenderCard: false,
        }))
      );
    return trade;
  });
}

export type TradeType = "single" | "multi" | "market";

export type TradeHistory = {
  id: number;
  type: TradeType;
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

  const tradesMap = new Map<number, TradeHistory>();

  for (const trade of trades) {
    let entry = tradesMap.get(trade.id);
    if (!entry) {
      entry = {
        id: trade.id,
        type: "multi",
        sender: trade.sender,
        receiver: trade.receiver,
        senderCards: [],
        receiverCards: [],
        createdAt: trade.createdAt!,
        cost: trade.cost,
      };
      tradesMap.set(trade.id, entry);
    }

    if (trade.card) {
      if (trade.isSenderCard) {
        entry.senderCards.push(trade.card);
      } else {
        entry.receiverCards.push(trade.card);
      }
    }
  }

  return [...tradesMap.values()];
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
    type: "single",
    sender: trade.fromUser,
    receiver: trade.toUser,
    senderCards: [trade.fromCard],
    receiverCards: [trade.toCard],
    createdAt: trade.createdAt!,
    cost: trade.cost,
  }));

  return tradesHistory;
}

async function getMarketTradeUserHistory(id: string) {
  const cardColumns = getTableColumns(tCards);
  const seller = aliasedTable(tgUsers, "seller");
  const buyer = aliasedTable(tgUsers, "buyer");

  const sellerColumns = getTableColumns(seller);
  const buyerColumns = getTableColumns(buyer);

  // A completed market trade = a completed listing joined to its accepted
  // offer. The seller gives the listing cards; the buyer gives the offer cards.
  const trades = await db
    .select({
      listingId: marketListings.id,
      offerId: marketOffers.id,
      seller: sellerColumns,
      buyer: buyerColumns,
      createdAt: marketOffers.createdAt,
    })
    .from(marketListings)
    .innerJoin(
      marketOffers,
      and(
        eq(marketOffers.listingId, marketListings.id),
        eq(marketOffers.status, "accepted")
      )
    )
    .innerJoin(seller, eq(seller.id, marketListings.sellerId))
    .innerJoin(buyer, eq(buyer.id, marketOffers.buyerId))
    .where(
      and(
        eq(marketListings.status, "completed"),
        or(eq(marketListings.sellerId, id), eq(marketOffers.buyerId, id))
      )
    );

  if (trades.length === 0) return [];

  const listingIds = trades.map((t) => t.listingId);
  const offerIds = trades.map((t) => t.offerId);

  const [listingCards, offerCards] = await Promise.all([
    db
      .select({ listingId: marketListingCards.listingId, card: cardColumns })
      .from(marketListingCards)
      .where(inArray(marketListingCards.listingId, listingIds))
      .innerJoin(tCards, eq(tCards.id, marketListingCards.cardId)),
    db
      .select({ offerId: marketOfferCards.offerId, card: cardColumns })
      .from(marketOfferCards)
      .where(inArray(marketOfferCards.offerId, offerIds))
      .innerJoin(tCards, eq(tCards.id, marketOfferCards.cardId)),
  ]);

  const listingCardsMap = Map.groupBy(listingCards, (c) => c.listingId);
  const offerCardsMap = Map.groupBy(offerCards, (c) => c.offerId);

  const tradesHistory: TradeHistory[] = trades.map((trade) => ({
    id: trade.listingId,
    type: "market",
    sender: trade.seller,
    receiver: trade.buyer,
    senderCards: (listingCardsMap.get(trade.listingId) ?? []).map((c) => c.card),
    receiverCards: (offerCardsMap.get(trade.offerId) ?? []).map((c) => c.card),
    createdAt: trade.createdAt!,
    cost: 0,
  }));

  return tradesHistory;
}

export async function userTradeHistory(userId: string) {
  const [singleTrades, multiTrades, marketTrades] = await Promise.all([
    getSingleTradeUserHistory(userId),
    getMultiTradeUserHistory(userId),
    getMarketTradeUserHistory(userId),
  ]);
  return [...singleTrades, ...multiTrades, ...marketTrades].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
