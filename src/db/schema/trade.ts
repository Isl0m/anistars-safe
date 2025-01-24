import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { tCards } from "./card";
import { tgUsers } from "./user";

export const multiTrades = pgTable("MultiTrade", {
  id: serial("id").primaryKey(),
  senderId: text("senderId")
    .notNull()
    .references(() => tgUsers.id, { onDelete: "cascade" }),
  receiverId: text("receiverId")
    .notNull()
    .references(() => tgUsers.id, { onDelete: "cascade" }),
  cost: integer("cost").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type SelectMultiTrade = typeof multiTrades.$inferSelect;
export type InsertMultiTrade = typeof multiTrades.$inferInsert;

export const multiTradeCards = pgTable("MultiTradeCards", {
  tradeId: integer("tradeId")
    .notNull()
    .references(() => multiTrades.id, { onDelete: "cascade" }),
  cardId: text("cardId")
    .notNull()
    .references(() => tCards.id, {
      onDelete: "cascade",
    }),
  isSenderCard: boolean("isSenderCard").notNull(),
});
