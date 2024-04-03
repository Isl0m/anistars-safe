import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const tgUsers = pgTable("TgUser", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  coins: integer("coins").default(0).notNull(),
  tries: integer("tries").default(3).notNull(),
  referrals: integer("referrals").default(0).notNull(),
  lastTimeGetCard: timestamp("lastTimeGetCard", {
    withTimezone: true,
  }),
  createdAt: timestamp("createdAt").defaultNow(),
});

const insertTgUserSchema = createInsertSchema(tgUsers);
export type InsertTgUser = z.infer<typeof insertTgUserSchema>;

const selectTgUserSchema = createSelectSchema(tgUsers);
export type User = z.infer<typeof selectTgUserSchema>;
