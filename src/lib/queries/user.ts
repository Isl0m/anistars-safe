import {
  and,
  count,
  eq,
  getTableColumns,
  isNull,
  ne,
  or,
  sql,
  sum,
} from "drizzle-orm";

import { db } from "@/db";
import { banners, userBanners } from "@/db/schema/banner";
import { cardToTgUser, tCards } from "@/db/schema/card";
import { marketListings } from "@/db/schema/market";
import { multiTrades } from "@/db/schema/trade";
import { tgUsers, userPasses } from "@/db/schema/user";

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

export function updateUserPhotoUrl(id: string, photoUrl: string | undefined) {
  if (!photoUrl) return;
  return db
    .update(tgUsers)
    .set({ photoUrl })
    .where(
      and(
        eq(tgUsers.id, id),
        or(isNull(tgUsers.photoUrl), ne(tgUsers.photoUrl, photoUrl))
      )
    );
}

export async function getUserProfileStats(id: string) {
  const [cardStats, tradeCount, marketStats] = await Promise.all([
    db
      .select({
        totalCards: count(cardToTgUser.cardId),
        totalValue: sum(tCards.price).mapWith(Number),
      })
      .from(cardToTgUser)
      .innerJoin(tCards, eq(tCards.id, cardToTgUser.cardId))
      .where(eq(cardToTgUser.tgUserId, id))
      .then((res) => res[0]),

    db
      .select({ count: count() })
      .from(multiTrades)
      .where(
        and(
          or(eq(multiTrades.senderId, id), eq(multiTrades.receiverId, id)),
          eq(multiTrades.status, "completed")
        )
      )
      .then((res) => res[0]?.count ?? 0),

    db
      .select({
        activeListings: count(
          sql`CASE WHEN ${marketListings.status} = 'active' THEN 1 END`
        ),
        completedSales: count(
          sql`CASE WHEN ${marketListings.status} = 'completed' THEN 1 END`
        ),
      })
      .from(marketListings)
      .where(eq(marketListings.sellerId, id))
      .then((res) => res[0]),
  ]);

  return {
    totalCards: cardStats?.totalCards ?? 0,
    totalValue: cardStats?.totalValue ?? 0,
    completedTrades: tradeCount,
    activeListings: marketStats?.activeListings ?? 0,
    completedSales: marketStats?.completedSales ?? 0,
  };
}

export async function getUserBanner(bannerId: number) {
  return db
    .select()
    .from(banners)
    .where(eq(banners.id, bannerId))
    .then((res) => res[0] ?? null);
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
