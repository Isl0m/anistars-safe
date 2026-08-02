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
import { tgUsers, tradingStatus, userPasses } from "@/db/schema/user";

export async function getUser(id: string) {
  const userColumns = getTableColumns(tgUsers);
  return db
    .select({
      ...userColumns,
      isPremium: sql<boolean>`COALESCE(${userPasses.isPremium}, false)`.mapWith(
        Boolean
      ),
      isTradeBanned:
        sql<boolean>`COALESCE(${tradingStatus.isBanned}, false)`.mapWith(
          Boolean
        ),
    })
    .from(tgUsers)
    .where(eq(tgUsers.id, id))
    .leftJoin(userPasses, eq(userPasses.id, tgUsers.id))
    .leftJoin(tradingStatus, eq(tradingStatus.userId, tgUsers.id))
    .then((res) => res[0] ?? null);
}

/**
 * The subset of a user that is safe to show a stranger.
 *
 * Server components pass their data to client components as props, and Next
 * serialises those props into the RSC payload — so selecting the whole row
 * server-side ships every column to the browser just as surely as returning it
 * from an API route would.
 */
export async function getPublicUser(id: string) {
  return db
    .select({
      id: tgUsers.id,
      name: tgUsers.name,
      photoUrl: tgUsers.photoUrl,
      createdAt: tgUsers.createdAt,
      isPremium: sql<boolean>`COALESCE(${userPasses.isPremium}, false)`.mapWith(
        Boolean
      ),
    })
    .from(tgUsers)
    .where(eq(tgUsers.id, id))
    .leftJoin(userPasses, eq(userPasses.id, tgUsers.id))
    .then((res) => res[0] ?? null);
}

export type PublicUser = NonNullable<
  Awaited<ReturnType<typeof getPublicUser>>
>;

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

export async function getUserProfileStats(id: string, full = true) {
  const cardStatsQuery = db
    .select({
      totalCards: count(cardToTgUser.cardId),
      totalValue: sum(tCards.price).mapWith(Number),
    })
    .from(cardToTgUser)
    .innerJoin(tCards, eq(tCards.id, cardToTgUser.cardId))
    .where(eq(cardToTgUser.tgUserId, id))
    .then((res) => res[0]);

  if (!full) {
    const cardStats = await cardStatsQuery;
    return {
      totalCards: cardStats?.totalCards ?? 0,
      totalValue: cardStats?.totalValue ?? 0,
      completedTrades: 0,
      activeListings: 0,
      completedSales: 0,
    };
  }

  const [cardStats, tradeCount, marketStats] = await Promise.all([
    cardStatsQuery,

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

export async function getBanners() {
  return db
    .select()
    .from(banners)
    .where(eq(banners.isPrivate, false))
    .orderBy(banners.id);
}

export async function getUserBanners(userId: string) {
  return db
    .select({
      bannerId: userBanners.bannerId,
      name: banners.name,
      file: banners.file,
      type: banners.type,
    })
    .from(userBanners)
    .innerJoin(banners, eq(banners.id, userBanners.bannerId))
    .where(eq(userBanners.userId, userId))
    .orderBy(userBanners.bannerId);
}

export async function updateUserBanner(userId: string, bannerId: number) {
  const owned = await db
    .select({ bannerId: userBanners.bannerId })
    .from(userBanners)
    .where(
      and(eq(userBanners.userId, userId), eq(userBanners.bannerId, bannerId))
    )
    .then((res) => res[0] ?? null);

  if (!owned) return { ok: false as const, error: "not_owned" };

  await db.update(tgUsers).set({ bannerId }).where(eq(tgUsers.id, userId));

  return { ok: true as const };
}
