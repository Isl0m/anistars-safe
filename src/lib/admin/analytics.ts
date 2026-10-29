import { sql } from "drizzle-orm";

import { db } from "@/db";

export type DailyPoint = {
  day: string;
  newUsers: number;
  activeUsers: number;
  triesSpent: number;
  coinsSpent: number;
  battles: number;
  revenue: number;
  payments: number;
  trades: number;
};

export type TopUser = {
  id: string;
  name: string;
  tgUserName: string | null;
  value: number;
};

export type Analytics = {
  generatedAt: string;
  days: number;
  users: {
    total: number;
    new1: number;
    new7: number;
    new30: number;
    dau: number;
    wau: number;
    mau: number;
    botBlocked: number;
    banned: number;
    staff: number;
    premium: number;
    retentionD1: number | null;
    retentionD7: number | null;
  };
  economy: { coins: number; sparkles: number; astrals: number; cards: number };
  revenue: {
    total: number;
    period: number;
    today: number;
    payers: number;
    payersPeriod: number;
  };
  series: DailyPoint[];
  topDonors: TopUser[];
  topReferrers: TopUser[];
  topRich: TopUser[];
  rarities: { name: string; count: number }[];
};

const n = (v: unknown) => Number(v ?? 0);

async function rows<T>(query: ReturnType<typeof sql>) {
  return (await db.execute(query)) as unknown as T[];
}

/**
 * Each block is one aggregate over a table the bot writes; none of them is
 * cheap on a large user base, so results are kept for a minute.
 */
const CACHE_MS = 60_000;
const cache = new Map<number, { at: number; data: Analytics }>();

export async function getAnalytics(days: number): Promise<Analytics> {
  const hit = cache.get(days);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const data = await computeAnalytics(days);
  cache.set(days, { at: Date.now(), data });
  return data;
}

async function computeAnalytics(days: number): Promise<Analytics> {
  const since = sql`current_date - ${days - 1}::int`;

  const [
    [users],
    [premium],
    [retention],
    [revenue],
    [cards],
    newUsers,
    activity,
    payments,
    trades,
    topDonors,
    topReferrers,
    topRich,
    rarities,
    calendar,
  ] = await Promise.all([
    rows<Record<string, unknown>>(sql`
      select
        count(*)::int as total,
        count(*) filter (where "createdAt" > now() - interval '1 day')::int as new1,
        count(*) filter (where "createdAt" > now() - interval '7 days')::int as new7,
        count(*) filter (where "createdAt" > now() - interval '30 days')::int as new30,
        count(*) filter (where "lastActivityAt" > now() - interval '1 day')::int as dau,
        count(*) filter (where "lastActivityAt" > now() - interval '7 days')::int as wau,
        count(*) filter (where "lastActivityAt" > now() - interval '30 days')::int as mau,
        count(*) filter (where "isBotBlocked")::int as bot_blocked,
        count(*) filter (where "isBlocked")::int as banned,
        count(*) filter (where "type" <> 'basic')::int as staff,
        coalesce(sum("coins"), 0)::float8 as coins,
        coalesce(sum("sparkles"), 0)::float8 as sparkles,
        coalesce(sum("astrals"), 0)::float8 as astrals
      from "TgUser"`),
    rows<{ count: number }>(
      sql`select count(*)::int as count from "UserPass" where "isPremium"`
    ),
    // lastActivityAt only keeps the latest visit, so "came back a day / a
    // week after joining" is measured on cohorts old enough to have had the
    // chance.
    rows<{ d1: number | null; d7: number | null }>(sql`
      select
        avg(case when "lastActivityAt" >= "createdAt" + interval '1 day' then 1.0 else 0 end)
          filter (where "createdAt" between now() - interval '31 days' and now() - interval '2 days')::float8 as d1,
        avg(case when "lastActivityAt" >= "createdAt" + interval '7 days' then 1.0 else 0 end)
          filter (where "createdAt" between now() - interval '37 days' and now() - interval '8 days')::float8 as d7
      from "TgUser"
      where "createdAt" > now() - interval '37 days'`),
    rows<Record<string, unknown>>(sql`
      select
        coalesce(sum("price"), 0)::float8 as total,
        coalesce(sum("price") filter (where "createdAt" >= ${since}), 0)::float8 as period,
        coalesce(sum("price") filter (where "createdAt" >= current_date), 0)::float8 as today,
        count(distinct coalesce("payerId", "userId"))::int as payers,
        count(distinct coalesce("payerId", "userId")) filter (where "createdAt" >= ${since})::int as payers_period
      from "Transactions"
      where "isPaid"`),
    rows<{ count: number }>(sql`select count(*)::int as count from "Card"`),
    rows<{ day: string; count: number }>(sql`
      select to_char("createdAt"::date, 'YYYY-MM-DD') as day, count(*)::int as count
      from "TgUser" where "createdAt" >= ${since} group by 1`),
    rows<Record<string, unknown>>(sql`
      select to_char("date", 'YYYY-MM-DD') as day,
        count(*)::int as active,
        coalesce(sum("triesSpent"), 0)::float8 as tries,
        coalesce(sum("coinsSpent"), 0)::float8 as coins,
        coalesce(sum("battlesPlayed"), 0)::float8 as battles
      from "UserDailyStats" where "date" >= ${since} group by 1`),
    rows<{ day: string; revenue: number; count: number }>(sql`
      select to_char("createdAt"::date, 'YYYY-MM-DD') as day,
        sum("price")::float8 as revenue, count(*)::int as count
      from "Transactions" where "isPaid" and "createdAt" >= ${since} group by 1`),
    rows<{ day: string; count: number }>(sql`
      select to_char("createdAt"::date, 'YYYY-MM-DD') as day, count(*)::int as count
      from "TradeLog" where "createdAt" >= ${since} group by 1`),
    rows<TopUser>(sql`
      select u."id", u."name", u."tgUserName", t.value
      from (
        select coalesce("payerId", "userId") as id, sum("price")::float8 as value
        from "Transactions" where "isPaid" group by 1 order by 2 desc limit 10
      ) t join "TgUser" u on u."id" = t.id
      order by t.value desc`),
    rows<TopUser>(sql`
      select u."id", u."name", u."tgUserName", t.value
      from (
        select "invitedById" as id, count(*)::int as value
        from "TgUser"
        where "invitedById" is not null and "createdAt" >= ${since}
        group by 1 order by 2 desc limit 10
      ) t join "TgUser" u on u."id" = t.id
      order by t.value desc`),
    rows<TopUser>(sql`
      select "id", "name", "tgUserName", "coins"::float8 as value
      from "TgUser" where "type" = 'basic'
      order by "coins" desc limit 10`),
    rows<{ name: string; count: number }>(sql`
      select r."name", count(c."id")::int as count
      from "Rarity" r left join "Card" c on c."rarityId" = r."id"
      group by r."id", r."name" order by r."id"`),
    // Day keys come from the database so they match its current_date.
    rows<{ day: string }>(sql`
      select to_char(d, 'YYYY-MM-DD') as day
      from generate_series(${since}, current_date, interval '1 day') d`),
  ]);

  const byDay = new Map<string, DailyPoint>();
  for (const { day } of calendar) {
    byDay.set(day, {
      day,
      newUsers: 0,
      activeUsers: 0,
      triesSpent: 0,
      coinsSpent: 0,
      battles: 0,
      revenue: 0,
      payments: 0,
      trades: 0,
    });
  }
  const at = (day: string) => byDay.get(day);
  newUsers.forEach((r) => {
    const p = at(r.day);
    if (p) p.newUsers = n(r.count);
  });
  activity.forEach((r) => {
    const p = at(String(r.day));
    if (!p) return;
    p.activeUsers = n(r.active);
    p.triesSpent = n(r.tries);
    p.coinsSpent = n(r.coins);
    p.battles = n(r.battles);
  });
  payments.forEach((r) => {
    const p = at(r.day);
    if (!p) return;
    p.revenue = n(r.revenue);
    p.payments = n(r.count);
  });
  trades.forEach((r) => {
    const p = at(r.day);
    if (p) p.trades = n(r.count);
  });

  const top = (list: TopUser[]) =>
    list.map((u) => ({ ...u, value: n(u.value) }));

  return {
    generatedAt: new Date().toISOString(),
    days,
    users: {
      total: n(users.total),
      new1: n(users.new1),
      new7: n(users.new7),
      new30: n(users.new30),
      dau: n(users.dau),
      wau: n(users.wau),
      mau: n(users.mau),
      botBlocked: n(users.bot_blocked),
      banned: n(users.banned),
      staff: n(users.staff),
      premium: n(premium?.count),
      retentionD1: retention?.d1 == null ? null : n(retention.d1),
      retentionD7: retention?.d7 == null ? null : n(retention.d7),
    },
    economy: {
      coins: n(users.coins),
      sparkles: n(users.sparkles),
      astrals: n(users.astrals),
      cards: n(cards?.count),
    },
    revenue: {
      total: n(revenue?.total),
      period: n(revenue?.period),
      today: n(revenue?.today),
      payers: n(revenue?.payers),
      payersPeriod: n(revenue?.payers_period),
    },
    series: Array.from(byDay.values()),
    topDonors: top(topDonors),
    topReferrers: top(topReferrers),
    topRich: top(topRich),
    rarities: rarities.map((r) => ({ name: r.name, count: n(r.count) })),
  };
}
