import { and, count, desc, eq, gt, sql, sum } from "drizzle-orm";

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

export type BoardKey =
  "collection" | "wins" | "loses" | "draws" | "tries" | "coins" | "traders";

type TopUser = {
  userId: string;
  name: string;
  photoUrl: string | null;
};

// How many players hold each value, highest value first: [value, players][].
// A player's rank is one more than everyone holding a higher value, so this
// is all the standing endpoint needs to place anyone without rescanning.
type Histogram = [number, number][];

// Postgres hands back counts as bigint strings and medians as doubles; every
// number on the page goes through here so the client only ever sees numbers.
const num = (value: unknown) => Number(value ?? 0);

const toHistogram = (value: unknown): Histogram =>
  ((value as [unknown, unknown][] | null) ?? []).map(([v, n]) => [
    num(v),
    num(n),
  ]);

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
async function getCollectionTop() {
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
        (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY cards) FROM per_user) AS median,
        CASE WHEN row_number() OVER (ORDER BY p.cards DESC, p.user_id) = 1 THEN (
          SELECT json_agg(json_build_array(cards, n) ORDER BY cards DESC)
          FROM (SELECT cards, count(*) AS n FROM per_user GROUP BY cards) h
        ) END AS histogram
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

  const board: CollectionTop = {
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
  return { board, histogram: toHistogram(rows[0]?.histogram) };
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

const hasFought = gt(
  sql`${battles.wins} + ${battles.draws} + ${battles.loses}`,
  0
);

// All-time colosseum results as the bot keeps them on the Battle row.
async function getColosseumTop(field: ColosseumField) {
  const column = battles[field];
  const [rows, histogram] = await Promise.all([
    db
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
      .innerJoin(tgUsers, eq(tgUsers.id, battles.id))
      .where(hasFought)
      .orderBy(desc(column), tgUsers.id)
      .limit(TOP_SIZE),
    db
      .select({ value: column, players: count() })
      .from(battles)
      .innerJoin(tgUsers, eq(tgUsers.id, battles.id))
      .where(hasFought)
      .groupBy(column)
      .orderBy(desc(column))
      .then((res) => res.map((r): [number, number] => [r.value, r.players])),
  ]);

  const board: ColosseumTop = {
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
  return { board, histogram };
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

async function getSpendingTop(field: SpendingField) {
  const column = userDailyStats[field];
  const spent = sum(column).mapWith(Number);

  const perUser = db
    .select({ spent: sum(column).as("spent") })
    .from(userDailyStats)
    .groupBy(userDailyStats.userId)
    .having(gt(sum(column), 0))
    .as("per_user");

  const [rows, histogram, since] = await Promise.all([
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
      .innerJoin(tgUsers, eq(tgUsers.id, userDailyStats.userId))
      .groupBy(tgUsers.id)
      .having(gt(sum(column), 0))
      .orderBy(desc(spent), tgUsers.id)
      .limit(TOP_SIZE),
    db
      .select({ value: perUser.spent, players: count() })
      .from(perUser)
      .groupBy(perUser.spent)
      .orderBy(desc(perUser.spent))
      .then((res) =>
        res.map((r): [number, number] => [num(r.value), r.players])
      ),
    db
      .select({ since: sql<string | null>`min(${userDailyStats.date})::text` })
      .from(userDailyStats)
      .then((res) => res[0]?.since ?? null),
  ]);

  const board: SpendingTop = {
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
  return { board, histogram };
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

// Every completed exchange as (a, b, at): single-card trades, completed
// multi-trades and banner trades. Self-trades are dropped by the callers.
const tradeEvents = sql`
  SELECT ${tradeLogs.fromUserId} AS a, ${tradeLogs.toUserId} AS b, ${tradeLogs.createdAt} AS at
  FROM ${tradeLogs}
  UNION ALL
  SELECT ${multiTrades.senderId}, ${multiTrades.receiverId}, ${multiTrades.createdAt}
  FROM ${multiTrades} WHERE ${multiTrades.status} = 'completed'
  UNION ALL
  SELECT ${tradeBanners.senderId}, ${tradeBanners.receiverId}, ${tradeBanners.createdAt}
  FROM ${tradeBanners} WHERE ${tradeBanners.status} = 'completed'
`;

// Ranked by distinct partners, so a hundred trades with one friend is one
// partner.
async function getTradersTop() {
  const rows = await db.execute<Record<string, unknown>>(sql`
    WITH events AS (${tradeEvents}),
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
      (SELECT min(at)::date::text FROM events) AS since,
      CASE WHEN row_number() OVER (ORDER BY p.partners DESC, p.trades DESC, p.user_id) = 1 THEN (
        SELECT json_agg(json_build_array(partners, n) ORDER BY partners DESC)
        FROM (SELECT partners, count(*) AS n FROM per_user GROUP BY partners) h
      ) END AS histogram
    FROM per_user p
    JOIN ${tgUsers} u ON u.id = p.user_id
    ORDER BY p.partners DESC, p.trades DESC, p.user_id
    LIMIT ${TOP_SIZE}
  `);

  const first = rows[0];
  const board: TradersTop = {
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
  return { board, histogram: toHistogram(first?.histogram) };
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

type Snapshot = {
  boards: Leaderboards;
  histograms: Record<BoardKey, Histogram>;
};

async function loadSnapshot(): Promise<Snapshot> {
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
    boards: {
      collection: collection.board,
      wins: wins.board,
      loses: loses.board,
      draws: draws.board,
      tries: tries.board,
      coins: coins.board,
      traders: traders.board,
      updatedAt: new Date().toISOString(),
    },
    histograms: {
      collection: collection.histogram,
      wins: wins.histogram,
      loses: loses.histogram,
      draws: draws.histogram,
      tries: tries.histogram,
      coins: coins.histogram,
      traders: traders.histogram,
    },
  };
}

// Every board scans a whole table, so the page and the standing endpoint
// share one computation per process, at most every ten minutes. Concurrent
// callers wait on the same promise; a failed load isn't kept.
const SNAPSHOT_TTL_MS = 10 * 60_000;
let snapshot: { at: number; data: Promise<Snapshot> } | undefined;

function getSnapshot() {
  if (!snapshot || Date.now() - snapshot.at > SNAPSHOT_TTL_MS) {
    const data = loadSnapshot();
    snapshot = { at: Date.now(), data };
    data.catch(() => {
      if (snapshot?.data === data) snapshot = undefined;
    });
  }
  return snapshot.data;
}

export async function getLeaderboards(): Promise<Leaderboards> {
  return (await getSnapshot()).boards;
}

export type Standing = {
  value: number;
  rank: number;
  players: number;
};

export type Standings = Record<BoardKey, Standing | null>;

// The player's own numbers, each read through an index on their id.
async function getUserValues(
  userId: string
): Promise<Record<BoardKey, number>> {
  const [cards, battle, spent, partners] = await Promise.all([
    db
      .select({
        count: sql<number>`count(distinct ${cardToTgUser.cardId})`.mapWith(
          Number
        ),
      })
      .from(cardToTgUser)
      .where(eq(cardToTgUser.tgUserId, userId))
      .then((res) => res[0]?.count ?? 0),
    db
      .select({
        wins: battles.wins,
        draws: battles.draws,
        loses: battles.loses,
      })
      .from(battles)
      .where(eq(battles.id, userId))
      .then((res) => res[0]),
    db
      .select({
        tries: sum(userDailyStats.triesSpent).mapWith(Number),
        coins: sum(userDailyStats.coinsSpent).mapWith(Number),
      })
      .from(userDailyStats)
      .where(eq(userDailyStats.userId, userId))
      .then((res) => res[0]),
    db
      .execute<{ partners: string }>(
        sql`
        WITH events AS (${tradeEvents})
        SELECT count(DISTINCT CASE WHEN a = ${userId} THEN b ELSE a END) AS partners
        FROM events
        WHERE (a = ${userId} OR b = ${userId}) AND a <> b
      `
      )
      .then((res) => num(res[0]?.partners)),
  ]);

  return {
    collection: cards,
    wins: battle?.wins ?? 0,
    loses: battle?.loses ?? 0,
    draws: battle?.draws ?? 0,
    tries: spent?.tries ?? 0,
    coins: spent?.coins ?? 0,
    traders: partners,
  };
}

export async function getUserStandings(userId: string): Promise<Standings> {
  const [{ boards, histograms }, values, battle] = await Promise.all([
    getSnapshot(),
    getUserValues(userId),
    db
      .select({ id: battles.id })
      .from(battles)
      .where(and(eq(battles.id, userId), hasFought))
      .then((res) => res.length > 0),
  ]);

  const standing = (key: BoardKey): Standing | null => {
    const value = values[key];
    // The colosseum boards rank everyone who has fought, zeros included;
    // the others only rank players with something to count.
    const ranked =
      key === "wins" || key === "loses" || key === "draws" ? battle : value > 0;
    if (!ranked) return null;

    const histogram = histograms[key];
    const players = histogram.reduce((total, [, n]) => total + n, 0);

    // Inside the top ten, the listed order (ties broken by id) is the rank.
    const listed = boards[key].rows.findIndex((r) => r.userId === userId);
    if (listed >= 0) return { value, rank: listed + 1, players };

    const ahead = histogram
      .filter(([v]) => v > value)
      .reduce((total, [, n]) => total + n, 0);
    return { value, rank: ahead + 1, players: Math.max(players, ahead + 1) };
  };

  return {
    collection: standing("collection"),
    wins: standing("wins"),
    loses: standing("loses"),
    draws: standing("draws"),
    tries: standing("tries"),
    coins: standing("coins"),
    traders: standing("traders"),
  };
}
