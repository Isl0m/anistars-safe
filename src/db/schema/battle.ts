import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Owned by the bot. Declared in full so a drizzle push from here describes the
// same table and doesn't propose dropping columns this app doesn't read.
type BattleStatus = "free" | "battling" | "battleSearch";

export const battles = pgTable(
  "Battle",
  {
    id: text("id").primaryKey(),
    status: text("status").$type<BattleStatus>().default("free").notNull(),
    stars: integer("stars").notNull().default(0),
    starsAllTime: integer("starsAllTime").notNull().default(0),
    wins: integer("wins").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    loses: integer("loses").notNull().default(0),
    lastBattle: timestamp("lastBattle", {
      withTimezone: true,
    }),
    botStreak: integer("botStreak").notNull().default(0),
    botLastNonWin: timestamp("botLastNonWin", {
      withTimezone: true,
    }),
    freeBattles: integer("freeBattles").notNull().default(0),
    weeklyResetAt: timestamp("weeklyResetAt", {
      withTimezone: true,
    }),
  },
  (table) => [
    index("battle_search_idx")
      .on(table.status, table.stars)
      .where(sql`"status" = 'battleSearch'`),
  ]
);
