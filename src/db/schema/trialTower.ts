import { integer, pgEnum, pgTable, serial, text } from "drizzle-orm/pg-core";

import { tCards } from "./card";

export const streakPoolEnum = pgEnum("StreakPool", [
  "base",
  "epic",
  "legendary",
]);
export type StreakPool = "base" | "epic" | "legendary";

export const trialTowerRewards = pgTable("TrialTowerReward", {
  id: serial("id").primaryKey(),
  cardId: text("cardId")
    .notNull()
    .references(() => tCards.id, { onDelete: "cascade" }),
  stock: integer("stock").notNull().default(0),
  initialStock: integer("initialStock").notNull().default(0),
  pool: streakPoolEnum("pool").notNull().default("base"),
});

export type TrialTowerReward = typeof trialTowerRewards.$inferSelect;
export type NewTrialTowerReward = typeof trialTowerRewards.$inferInsert;
