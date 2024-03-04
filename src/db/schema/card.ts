import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { tAuthors } from "./author";
import { tgUsers } from "./user";

export const tCards = pgTable("Card", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  power: integer("power").notNull(),
  stamina: integer("stamina").notNull(),
  image: text("image").notNull(),
  droppable: boolean("droppable").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),

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
});

const insertCardSchema = createSelectSchema(tCards);
export type Card = z.infer<typeof insertCardSchema>;

const insertRaritySchema = createSelectSchema(tRarities);
export type Rarity = z.infer<typeof insertRaritySchema>;

const insertClassSchema = createSelectSchema(tClasses, {
  beats: z.array(z.string()),
});
export type Element = z.infer<typeof insertClassSchema>;

const insertUniverseSchema = createSelectSchema(tUniverses);
export type Universe = z.infer<typeof insertUniverseSchema>;

const insertAuthorSchema = createSelectSchema(tAuthors);
export type Author = z.infer<typeof insertAuthorSchema>;

export type FullCard = {
  Card: Card;
  Rarity: Rarity | null;
  Element: Element | null;
  Universe: Universe | null;
  Author: Author | null;
};
