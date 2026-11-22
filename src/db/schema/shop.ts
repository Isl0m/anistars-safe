import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const shopPages = pgTable("ShopPage", {
  id: serial("id").primaryKey(),
  shop: text("shop").$type<"chromatic" | "event">().notNull(),
  poster: text("poster").notNull(),
  icon: text("icon").notNull(),
  position: integer("position").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
});

export const shopPageCards = pgTable("ShopPageCard", {
  id: serial("id").primaryKey(),
  pageId: integer("pageId").notNull(),
  cardId: text("cardId").notNull(),
  position: integer("position").notNull().default(0),
});
