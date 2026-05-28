import {
  and,
  eq,
  getTableColumns,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import { banners, userBanners } from "@/db/schema/banner";
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
