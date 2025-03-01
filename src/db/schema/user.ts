import {
  boolean,
  foreignKey,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export type UserTypes = "admin" | "support" | "basic";

export const tgUsers = pgTable(
  "TgUser",
  {
    id: text("id").notNull().primaryKey(),
    name: text("name").notNull().default("Noname"),

    tgName: text("tgName"),
    tgUserName: text("tgUserName"),

    coins: integer("coins").default(0).notNull(),
    sparkles: integer("sparkles").default(0).notNull(),
    tries: integer("tries").default(3).notNull(),
    event: integer("event").default(0).notNull(),
    referrals: integer("referrals").default(0).notNull(),

    giftStreak: integer("giftStreak").default(1).notNull(),
    isBlocked: boolean("isBlocked").default(false).notNull(),

    isInvisible: boolean("isInvisible").default(false).notNull(),
    isNotification: boolean("isNotification").default(true).notNull(),

    isTradeBanned: boolean("isTradeBanned").default(false).notNull(),
    invitedById: text("invitedById"),
    type: text("type").$type<UserTypes>().default("basic").notNull(),

    lastTimeGetBoostGift: timestamp("lastTimeGetBoostGift", {
      withTimezone: true,
    }),
    lastTimeGetGift: timestamp("lastTimeGetGift", {
      withTimezone: true,
    }),
    lastTimeGetCard: timestamp("lastTimeGetCard", {
      withTimezone: true,
    }),
    lastActivityAt: timestamp("lastActivityAt", {
      withTimezone: true,
    }),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => {
    return {
      parentReference: foreignKey({
        columns: [table.invitedById],
        foreignColumns: [table.id],
        name: "contracts_invitedby_id_fkey",
      }),
    };
  }
);

export const userPasses = pgTable("UserPass", {
  id: text("id").notNull().primaryKey(),
  points: integer("points").default(0).notNull(),
  currentStep: integer("currentStep").default(0).notNull(),
  premiumStep: integer("premiumStep").default(0).notNull(),
  isPremium: boolean("isPremium").default(false).notNull(),
  tasksGeneratedAt: timestamp("tasksGeneratedAt", {
    withTimezone: true,
  }),
});

const insertTgUserSchema = createInsertSchema(tgUsers);
export type InsertTgUser = z.infer<typeof insertTgUserSchema>;

const selectTgUserSchema = createSelectSchema(tgUsers);
export type User = z.infer<typeof selectTgUserSchema>;
export type UserExtended = User & { isPremium: boolean };
