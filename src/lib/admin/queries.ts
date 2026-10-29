import { desc, eq, sql, SQL } from "drizzle-orm";

import { getRedis } from "@/lib/redis";

import { db } from "@/db";
import { adminLogs } from "@/db/schema/admin-log";

async function rows<T>(query: SQL) {
  return (await db.execute(query)) as unknown as T[];
}

// ---------------------------------------------------------------- users

export const USER_FILTERS = [
  "recent",
  "active",
  "rich",
  "premium",
  "banned",
  "botBlocked",
  "staff",
] as const;
export type UserFilter = (typeof USER_FILTERS)[number];

export type AdminUserRow = {
  id: string;
  name: string;
  tgName: string | null;
  tgUserName: string | null;
  photoUrl: string | null;
  type: string;
  coins: number;
  isBlocked: boolean;
  isBotBlocked: boolean;
  lastActivityAt: string | null;
  createdAt: string | null;
};

export const USERS_PER_PAGE = 20;

export async function searchUsers(q: string, filter: UserFilter, page: number) {
  const where: SQL[] = [];
  const term = q.trim().replace(/^@/, "");
  if (term) {
    const like = `%${term.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(sql`(
      u."id" = ${term}
      or u."tgUserName" ilike ${term}
      or u."name" ilike ${like}
      or u."tgName" ilike ${like}
    )`);
  }

  let join = sql``;
  let order = sql`u."createdAt" desc nulls last`;
  switch (filter) {
    case "active":
      order = sql`u."lastActivityAt" desc nulls last`;
      break;
    case "rich":
      order = sql`u."coins" desc`;
      break;
    case "premium":
      join = sql`join "UserPass" p on p."id" = u."id" and p."isPremium"`;
      break;
    case "banned":
      where.push(sql`u."isBlocked"`);
      break;
    case "botBlocked":
      where.push(sql`u."isBotBlocked"`);
      order = sql`u."lastActivityAt" desc nulls last`;
      break;
    case "staff":
      where.push(sql`u."type" <> 'basic'`);
      break;
  }

  const whereSql = where.length
    ? sql`where ${sql.join(where, sql` and `)}`
    : sql``;
  const offset = (page - 1) * USERS_PER_PAGE;

  const list = await rows<AdminUserRow>(sql`
    select u."id", u."name", u."tgName", u."tgUserName", u."photoUrl", u."type",
      u."coins", u."isBlocked", u."isBotBlocked", u."lastActivityAt", u."createdAt"
    from "TgUser" u ${join}
    ${whereSql}
    order by ${order}
    limit ${USERS_PER_PAGE + 1} offset ${offset}`);

  return {
    users: list.slice(0, USERS_PER_PAGE),
    hasMore: list.length > USERS_PER_PAGE,
  };
}

export async function getAdminUser(id: string) {
  const [user] = await rows<Record<string, unknown>>(sql`
    select u.*,
      coalesce(p."isPremium", false) as "isPremium",
      p."points" as "passPoints", p."currentStep" as "passStep",
      b."stars" as "battleStars", b."starsAllTime" as "battleStarsAllTime",
      b."wins" as "battleWins", b."loses" as "battleLoses",
      b."draws" as "battleDraws", b."status" as "battleStatus",
      c."id" as "clanId", c."name" as "clanName", cm."role" as "clanRole",
      coalesce(ts."isBanned", false) as "isTradeBanned",
      ts."banExpiresAt" as "tradeBanExpiresAt",
      inv."name" as "invitedByName",
      t."name" as "titleName"
    from "TgUser" u
    left join "UserPass" p on p."id" = u."id"
    left join "Battle" b on b."id" = u."id"
    left join "ClanMembers" cm on cm."memberId" = u."id"
    left join "Clan" c on c."id" = cm."clanId"
    left join "TradingStatus" ts on ts."userId" = u."id"
    left join "TgUser" inv on inv."id" = u."invitedById"
    left join "Title" t on t."id" = u."titleId"
    where u."id" = ${id}
    limit 1`);
  if (!user) return null;

  const [[counts], payments, daily, logs] = await Promise.all([
    rows<Record<string, number>>(sql`
      select
        (select count(*)::int from "CardToTgUser" where "tgUserId" = ${id}) as cards,
        (select count(*)::int from "TgUser" where "invitedById" = ${id}) as referrals,
        (select coalesce(sum("price"), 0)::int from "Transactions"
          where "isPaid" and coalesce("payerId", "userId") = ${id}) as donated,
        (select count(*)::int from "TradeLog"
          where "fromUserId" = ${id} or "toUserId" = ${id}) as trades`),
    rows<Record<string, unknown>>(sql`
      select "id", "title", "price", "isPaid", "createdAt", "payerId"
      from "Transactions" where "userId" = ${id} or "payerId" = ${id}
      order by "createdAt" desc limit 10`),
    rows<Record<string, unknown>>(sql`
      select to_char("date", 'YYYY-MM-DD') as day, "triesSpent", "coinsSpent",
        "sparklesSpent", "battlesPlayed"
      from "UserDailyStats" where "userId" = ${id}
      order by "date" desc limit 14`),
    db
      .select()
      .from(adminLogs)
      .where(eq(adminLogs.targetUserId, id))
      .orderBy(desc(adminLogs.createdAt))
      .limit(15),
  ]);

  return { user, counts, payments, daily, logs };
}

// ---------------------------------------------------------------- broadcasts

export type BroadcastSummary = {
  batchTag: string;
  total: number;
  completed: number;
  failed: number;
  blocked: number;
  pending: number;
  startedAt: string;
  lastAt: string | null;
};

/**
 * Batches among the last million tasks. The table grows by one row per user
 * per broadcast and has no index on time, so the window rides the primary key.
 */
export async function listBroadcasts() {
  return rows<BroadcastSummary>(sql`
    select "batchTag",
      count(*)::int as total,
      count(*) filter (where "status" = 'completed')::int as completed,
      count(*) filter (where "status" = 'failed')::int as failed,
      count(*) filter (where "status" = 'blocked')::int as blocked,
      count(*) filter (where "status" = 'pending')::int as pending,
      min("enqueuedAt") as "startedAt",
      max("processedAt") as "lastAt"
    from "BroadcastTask"
    where "id" > (select coalesce(max("id"), 0) from "BroadcastTask") - 1000000
    group by "batchTag"
    order by min("enqueuedAt") desc
    limit 20`);
}

export async function broadcastExists(batchTag: string) {
  const found = await rows(sql`
    select 1 from "BroadcastTask" where "batchTag" = ${batchTag} limit 1`);
  return found.length > 0;
}

export async function countAudience(audience: string) {
  const base = sql`not u."isBlocked" and not u."isBotBlocked"`;
  const days = { active1: 1, active7: 7, active30: 30 }[audience];
  const query =
    audience === "premium"
      ? sql`select count(*)::int as count from "TgUser" u
          join "UserPass" p on p."id" = u."id" and p."isPremium" where ${base}`
      : days
        ? sql`select count(*)::int as count from "TgUser" u where ${base}
            and u."lastActivityAt" > now() - make_interval(days => ${days})`
        : sql`select count(*)::int as count from "TgUser" u where ${base}`;
  const [row] = await rows<{ count: number }>(query);
  return Number(row?.count ?? 0);
}

// ---------------------------------------------------------------- promos

export type PromoRow = {
  id: number;
  slug: string;
  tries: number | null;
  coins: number | null;
  sparkles: number | null;
  event: number | null;
  random: number | null;
  isHidden: boolean | null;
  cardId: string | null;
  cardName: string | null;
  cardSlug: string | null;
  cardIds: string[] | null;
  packId: number | null;
  packName: string | null;
  text: string | null;
  uses: number;
};

export async function listPromos() {
  return rows<PromoRow>(sql`
    select p."id", p."slug", p."tries", p."coins", p."sparkles", p."event",
      p."random", p."isHidden", p."cardId", c."name" as "cardName",
      c."slug" as "cardSlug", p."cardIds",
      p."packId", pk."name" as "packName", p."text",
      coalesce(u.uses, 0)::int as uses
    from "Promo" p
    left join "Card" c on c."id" = p."cardId"
    left join "Pack" pk on pk."id" = p."packId"
    left join (
      select "promoId", count(*) as uses from "PromoToTgUser" group by 1
    ) u on u."promoId" = p."id"
    order by p."id" desc`);
}

export type PromoInput = {
  slug: string;
  reward: "coins" | "tries" | "sparkles" | "event" | "card" | "pack";
  amount: number | null;
  random: number | null;
  cardSlug: string | null;
  packId: number | null;
  isHidden: boolean;
  text: string | null;
};

export type PromoColumns = {
  tries: number | null;
  coins: number | null;
  sparkles: number | null;
  event: number | null;
  cardId: string | null;
  packId: number | null;
};

/**
 * Resolves the form into Promo columns, or an error message. One reward per
 * promo: /promocode stops at the first currency it finds.
 */
export async function promoColumns(
  input: PromoInput
): Promise<{ columns: PromoColumns } | { error: string }> {
  const columns: PromoColumns = {
    tries: null,
    coins: null,
    sparkles: null,
    event: null,
    cardId: null,
    packId: null,
  };
  if (input.reward === "card") {
    if (!input.cardSlug) return { error: "Укажите slug карты" };
    const [card] = await rows<{ id: string }>(
      sql`select "id" from "Card" where "slug" = ${input.cardSlug}`
    );
    if (!card) return { error: "Карта не найдена" };
    columns.cardId = card.id;
  } else if (input.reward === "pack") {
    if (!input.packId) return { error: "Выберите пак" };
    const [pack] = await rows(
      sql`select "id" from "Pack" where "id" = ${input.packId}`
    );
    if (!pack) return { error: "Пак не найден" };
    columns.packId = input.packId;
  } else {
    if (!input.amount || input.amount <= 0)
      return { error: "Укажите количество" };
    columns[input.reward] = input.amount;
  }
  return { columns };
}

export async function createPromo(input: PromoInput, c: PromoColumns) {
  const [row] = await rows<{ id: number }>(sql`
    insert into "Promo" ("slug", "tries", "coins", "sparkles", "event", "random",
      "isHidden", "cardId", "packId", "text")
    values (${input.slug}, ${c.tries}, ${c.coins}, ${c.sparkles}, ${c.event},
      ${input.random}, ${input.isHidden}, ${c.cardId}, ${c.packId}, ${input.text})
    on conflict ("slug") do nothing
    returning "id"`);
  return row?.id ?? null;
}

export async function updatePromo(
  id: number,
  input: PromoInput,
  c: PromoColumns
) {
  const updated = await rows(sql`
    update "Promo" set "slug" = ${input.slug}, "tries" = ${c.tries},
      "coins" = ${c.coins}, "sparkles" = ${c.sparkles}, "event" = ${c.event},
      "random" = ${input.random}, "isHidden" = ${input.isHidden},
      "cardId" = ${c.cardId}, "packId" = ${c.packId},
      "text" = ${input.text}
    where "id" = ${id}
    returning "id"`);
  return updated.length > 0;
}

export async function deletePromo(id: number) {
  const deleted = await rows<{ slug: string }>(
    sql`delete from "Promo" where "id" = ${id} returning "slug"`
  );
  return deleted[0]?.slug ?? null;
}

export async function promoSlugTaken(slug: string, exceptId?: number) {
  const found = await rows(sql`
    select 1 from "Promo" where "slug" = ${slug}
    ${exceptId ? sql`and "id" <> ${exceptId}` : sql``} limit 1`);
  return found.length > 0;
}

// ---------------------------------------------------------------- catalog

export async function getCatalog() {
  const [packs, titles] = await Promise.all([
    rows<{ id: number; name: string }>(
      sql`select "id", "name" from "Pack" order by "id"`
    ),
    rows<{ id: number; name: string }>(
      sql`select "id", "name" from "Title" order by "id"`
    ),
  ]);
  return { packs, titles };
}

export async function searchCards(q: string) {
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  return rows<{ slug: string; name: string; rarity: string }>(sql`
    select c."slug", c."name", r."name" as rarity
    from "Card" c join "Rarity" r on r."id" = c."rarityId"
    where c."slug" ilike ${like} or c."name" ilike ${like}
    order by c."name" limit 15`);
}

// ---------------------------------------------------------------- logs

export const LOGS_PER_PAGE = 30;

export async function listAdminLogs(page: number) {
  const list = await rows<Record<string, unknown>>(sql`
    select l.*, u."name" as "targetName"
    from "AdminLog" l left join "TgUser" u on u."id" = l."targetUserId"
    order by l."createdAt" desc
    limit ${LOGS_PER_PAGE + 1} offset ${(page - 1) * LOGS_PER_PAGE}`);
  return {
    logs: list.slice(0, LOGS_PER_PAGE),
    hasMore: list.length > LOGS_PER_PAGE,
  };
}

// ---------------------------------------------------------------- features

export const FEATURES = {
  battle: { key: "battle-status", label: "Битвы (PvP)" },
  clans: { key: "clans-status", label: "Кланы, войны и приключение" },
  testMode: { key: "test-mode-status", label: "Тестовый режим" },
} as const;
export type Feature = keyof typeof FEATURES;

/** Same defaults as the bot: a flag that was never set reads as on. */
export async function getFeatureFlags() {
  const redis = getRedis();
  const keys = Object.values(FEATURES).map((f) => f.key);
  const values = await redis.mget(...keys);
  return Object.fromEntries(
    (Object.keys(FEATURES) as Feature[]).map((name, i) => [
      name,
      values[i] !== "off",
    ])
  ) as Record<Feature, boolean>;
}
