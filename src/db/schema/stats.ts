import {
  date,
  integer,
  pgTable,
  serial,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { tgUsers } from "./user";

// Owned by the bot, which writes one row per player per day (Asia/Bangkok).
// Declared in full so a drizzle push from here describes the same table.
export const userDailyStats = pgTable(
  "UserDailyStats",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => tgUsers.id, { onDelete: "cascade" }),
    date: date("date").notNull().defaultNow(),

    triesSpent: integer("triesSpent").notNull().default(0),
    coinsSpent: integer("coinsSpent").notNull().default(0),
    sparklesSpent: integer("sparklesSpent").notNull().default(0),
    astralsSpent: integer("astralsSpent").notNull().default(0),
    eventSpent: integer("eventSpent").notNull().default(0),

    battlesPlayed: integer("battlesPlayed").notNull().default(0),
  },
  (table) => [uniqueIndex("user_date_idx").on(table.userId, table.date)]
);
