import {
    boolean,
    integer,
    pgTable,
    real,
    serial,
    text,
    timestamp,
} from "drizzle-orm/pg-core";

import { tAuthors } from "./author";
import { tgUsers } from "./user";

export type CardTypes = "full" | "pre-full" | "basic";

export const tCards = pgTable("Card", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  power: integer("power").notNull(),
  stamina: integer("stamina").notNull(),
  image: text("image").notNull(),
  gif: text("gif"),
  droppable: boolean("droppable").default(true).notNull(),
  type: text("type").$type<CardTypes>().default("basic").notNull(),
  collection: text("collection"),
  price: integer("price").default(0).notNull(),

  createdAt: timestamp("createdAt").defaultNow(),

  techniqueId: integer("techniqueId").references(() => tTechniques.id, {
    onDelete: "set null",
  }),
  authorId: integer("authorId")
    .notNull()
    .references(() => tAuthors.id, { onDelete: "cascade" }),
  universeId: integer("universeId")
    .notNull()
    .references(() => tUniverses.id, { onDelete: "cascade" }),
  classId: integer("classId")
    .notNull()
    .references(() => tClasses.id, { onDelete: "cascade" }),
  rarityId: integer("rarityId")
    .notNull()
    .references(() => tRarities.id, { onDelete: "cascade" }),
});

export const cardToTgUser = pgTable("CardToTgUser", {
  cardId: text("cardId")
    .notNull()
    .references(() => tCards.id, { onDelete: "cascade" }),
  tgUserId: text("tgUserId")
    .notNull()
    .references(() => tgUsers.id, { onDelete: "cascade" }),
  isLocked: boolean("isLocked").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});

export const tUniverses = pgTable("Universe", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

export const tClasses = pgTable("Class", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  beats: text("beats").array(),
  icon: text("icon"),
});

export const tRarities = pgTable("Rarity", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  chance: real("chance").default(0.1).notNull(),
  cashback: integer("cashback").default(5).notNull(),
  rank: integer("rank").default(1).notNull(),
});

export const tTechniques = pgTable("Technique", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  text: text("text").notNull(),
  heal: real("heal").default(0),
  power: real("power").default(0),
  dodge: boolean("dodge").default(false),
  chance: real("chance").default(0.15).notNull(),
});

export type Technique = typeof tTechniques.$inferSelect;

export type Card = typeof tCards.$inferSelect;

export type Rarity = typeof tRarities.$inferSelect;

export type Class = typeof tClasses.$inferSelect;

export type Universe = typeof tUniverses.$inferSelect;

export type Author = typeof tAuthors.$inferSelect;

export type FullCard = Card & {
  rarity: string;
  universe: string;
  class: string;
  author: string;
  technique: Technique | null;
};
