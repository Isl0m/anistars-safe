import { count, desc, gt, sql, sum } from "drizzle-orm";

import {
  CHROMATIC_RARITY_ID,
  EMERALD_RARITY_ID,
  TOP_SIZE,
} from "@/lib/constants";

import { db } from "@/db";
import { battles } from "@/db/schema/battle";
import { cardToTgUser, tCards } from "@/db/schema/card";
import { userDailyStats } from "@/db/schema/stats";
import { multiTrades, tradeBanners, tradeLogs } from "@/db/schema/trade";
import { tgUsers } from "@/db/schema/user";

type TopUser = {
  userId: string;
  name: string;
  photoUrl: string | null;
};

// Postgres hands back counts as bigint strings and medians as doubles; every
// number on the page goes through here so the client only ever sees numbers.
const num = (value: unknown) => Number(value ?? 0);

export type CollectionTopRow = TopUser & {
  cards: number;
  emeralds: number;
  chromatics: number;
};

export type CollectionTop = {
  rows: CollectionTopRow[];
  totalCards: number;
  players: number;
  medianCards: number;
};

// A card counts once per player however many copies they hold.
export async function getCollectionTop(): Promise<CollectionTop> {
  const [rows, totalCards] = await Promise.all([
    db.execute<Record<string, unknown>>(sql`
      WITH owned AS (
        SELECT DISTINCT ${cardToTgUser.tgUserId} AS user_id, ${cardToTgUser.cardId} AS card_id
        FROM ${cardToTgUser}
      ),
      per_user AS (
        SELECT
          o.user_id,
          count(*) AS cards,
          count(*) FILTER (WHERE c."rarityId" = ${EMERALD_RARITY_ID}) AS emeralds,
          count(*) FILTER (WHERE c."rarityId" = ${CHROMATIC_RARITY_ID}) AS chromatics
        FROM owned o
        JOIN ${tCards} c ON c.id = o.card_id
        GROUP BY o.user_id
      )
      SELECT
        p.user_id, u.name, u."photoUrl", p.cards, p.emeralds, p.chromatics,
        (SELECT count(*) FROM per_user) AS players,
        (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY cards) FROM per_user) AS median
      FROM per_user p
      JOIN ${tgUsers} u ON u.id = p.user_id
      ORDER BY p.cards DESC, p.user_id
      LIMIT ${TOP_SIZE}
    `),
    db
      .select({ count: count() })
      .from(tCards)
      .then((res) => res[0]?.count ?? 0),
  ]);

  return {
    rows: rows.map((r) => ({
      userId: String(r.user_id),
      name: String(r.name),
      photoUrl: (r.photoUrl as string | null) ?? null,
      cards: num(r.cards),
      emeralds: num(r.emeralds),
      chromatics: num(r.chromatics),
    })),
    totalCards,
    players: num(rows[0]?.players),
    medianCards: Math.round(num(rows[0]?.median)),
  };
}

export type ColosseumField = "wins" | "draws" | "loses";

export type ColosseumTopRow = TopUser & {
  wins: number;
  draws: number;
  loses: number;
};

export type ColosseumTop = {
  rows: ColosseumTopRow[];
  total: number;
  players: number;
};

// All-time colosseum results as the bot keeps them on the Battle row.
export async function getColosseumTop(
  field: ColosseumField
): Promise<ColosseumTop> {
  const column = battles[field];
  const rows = await db
    .select({
      userId: tgUsers.id,
      name: tgUsers.name,
      photoUrl: tgUsers.photoUrl,
      wins: battles.wins,
      draws: battles.draws,
      loses: battles.loses,
      total: sql<string>`sum(${column}) over ()`,
      players: sql<string>`count(*) over ()`,
    })
    .from(battles)
    .innerJoin(tgUsers, sql`${tgUsers.id} = ${battles.id}`)
    .where(gt(sql`${battles.wins} + ${battles.draws} + ${battles.loses}`, 0))
    .orderBy(desc(column), tgUsers.id)
    .limit(TOP_SIZE);

  return {
    rows: rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      photoUrl: r.photoUrl,
      wins: r.wins,
      draws: r.draws,
      loses: r.loses,
    })),
    total: num(rows[0]?.total),
    players: num(rows[0]?.players),
  };
}

export type SpendingField = "triesSpent" | "coinsSpent";

export type SpendingTopRow = TopUser & {
  spent: number;
  activeDays: number;
  bestDay: number;
};

export type SpendingTop = {
  rows: SpendingTopRow[];
  total: number;
  players: number;
  // First day the bot kept daily stats; nothing before it is counted.
  since: string | null;
};

export async function getSpendingTop(
  field: SpendingField
): Promise<SpendingTop> {
  const column = userDailyStats[field];
  const spent = sum(column).mapWith(Number);

  const [rows, since] = await Promise.all([
    db
      .select({
        userId: tgUsers.id,
        name: tgUsers.name,
        photoUrl: tgUsers.photoUrl,
        spent,
        activeDays: sql<number>`count(*) filter (where ${column} > 0)`.mapWith(
          Number
        ),
        bestDay: sql<number>`max(${column})`.mapWith(Number),
        total: sql<string>`sum(sum(${column})) over ()`,
        players: sql<string>`count(*) over ()`,
      })
      .from(userDailyStats)
      .innerJoin(tgUsers, sql`${tgUsers.id} = ${userDailyStats.userId}`)
      .groupBy(tgUsers.id)
      .having(gt(sum(column), 0))
      .orderBy(desc(spent), tgUsers.id)
      .limit(TOP_SIZE),
    db
      .select({ since: sql<string | null>`min(${userDailyStats.date})::text` })
      .from(userDailyStats)
      .then((res) => res[0]?.since ?? null),
  ]);

  return {
    rows: rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      photoUrl: r.photoUrl,
      spent: r.spent,
      activeDays: r.activeDays,
      bestDay: r.bestDay,
    })),
    total: num(rows[0]?.total),
    players: num(rows[0]?.players),
    since,
  };
}

export type TradersTopRow = TopUser & {
  partners: number;
  trades: number;
  recentPartners: number;
};

export type TradersTop = {
  rows: TradersTopRow[];
  trades: number;
  players: number;
  pairs: number;
  medianPartners: number;
  since: string | null;
};

// Ranked by distinct partners, so a hundred trades with one friend is one
// partner. Single-card trades, completed multi-trades and banner trades all
// count; a self-trade never does.
export async function getTradersTop(): Promise<TradersTop> {
  const rows = await db.execute<Record<string, unknown>>(sql`
    WITH events AS (
      SELECT ${tradeLogs.fromUserId} AS a, ${tradeLogs.toUserId} AS b, ${tradeLogs.createdAt} AS at
      FROM ${tradeLogs}
      UNION ALL
      SELECT ${multiTrades.senderId}, ${multiTrades.receiverId}, ${multiTrades.createdAt}
      FROM ${multiTrades} WHERE ${multiTrades.status} = 'completed'
      UNION ALL
      SELECT ${tradeBanners.senderId}, ${tradeBanners.receiverId}, ${tradeBanners.createdAt}
      FROM ${tradeBanners} WHERE ${tradeBanners.status} = 'completed'
    ),
    sides AS (
      SELECT a AS user_id, b AS partner_id, at FROM events WHERE a <> b
      UNION ALL
      SELECT b, a, at FROM events WHERE a <> b
    ),
    per_user AS (
      SELECT
        user_id,
        count(DISTINCT partner_id) AS partners,
        count(*) AS trades,
        count(DISTINCT partner_id) FILTER (WHERE at > now() - interval '30 days') AS recent_partners
      FROM sides
      GROUP BY user_id
    )
    SELECT
      p.user_id, u.name, u."photoUrl", p.partners, p.trades, p.recent_partners,
      (SELECT count(*) FROM events WHERE a <> b) AS total_trades,
      (SELECT count(*) FROM per_user) AS players,
      (SELECT count(DISTINCT (least(a, b), greatest(a, b))) FROM events WHERE a <> b) AS pairs,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY partners) FROM per_user) AS median,
      (SELECT min(at)::date::text FROM events) AS since
    FROM per_user p
    JOIN ${tgUsers} u ON u.id = p.user_id
    ORDER BY p.partners DESC, p.trades DESC, p.user_id
    LIMIT ${TOP_SIZE}
  `);

  const first = rows[0];
  return {
    rows: rows.map((r) => ({
      userId: String(r.user_id),
      name: String(r.name),
      photoUrl: (r.photoUrl as string | null) ?? null,
      partners: num(r.partners),
      trades: num(r.trades),
      recentPartners: num(r.recent_partners),
    })),
    trades: num(first?.total_trades),
    players: num(first?.players),
    pairs: num(first?.pairs),
    medianPartners: Math.round(num(first?.median)),
    since: (first?.since as string | null) ?? null,
  };
}

export type Leaderboards = {
  collection: CollectionTop;
  wins: ColosseumTop;
  loses: ColosseumTop;
  draws: ColosseumTop;
  tries: SpendingTop;
  coins: SpendingTop;
  traders: TradersTop;
  updatedAt: string;
};

export async function getLeaderboards(): Promise<Leaderboards> {
  const [collection, wins, loses, draws, tries, coins, traders] =
    await Promise.all([
      getCollectionTop(),
      getColosseumTop("wins"),
      getColosseumTop("loses"),
      getColosseumTop("draws"),
      getSpendingTop("triesSpent"),
      getSpendingTop("coinsSpent"),
      getTradersTop(),
    ]);

  return {
    collection,
    wins,
    loses,
    draws,
    tries,
    coins,
    traders,
    updatedAt: new Date().toISOString(),
  };
}
