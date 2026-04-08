import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { tCards } from "./card";
import { tgUsers } from "./user";

export type MarketListingStatus = "active" | "completed" | "cancelled";

export interface MarketFilters {
  rarityIds?: number[];
  universeIds?: number[];
  classIds?: number[];
  type?: ("upgrade" | "upgradable" | "limited" | "basic")[];
  stats?: ("full" | "pre-full" | "basic")[];
  minCardPrice?: number;
  minCardCount?: number;
  maxCardCount?: number;
}

export const marketListings = pgTable("MarketListing", {
  id: serial("id").primaryKey(),
  sellerId: text("sellerId")
    .notNull()
    .references(() => tgUsers.id, { onDelete: "cascade" }),
  filters: jsonb("filters").$type<MarketFilters>(),
  status: text("status")
    .$type<MarketListingStatus>()
    .notNull()
    .default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const marketListingCards = pgTable("MarketListingCards", {
  listingId: integer("listingId")
    .notNull()
    .references(() => marketListings.id, { onDelete: "cascade" }),
  cardId: text("cardId")
    .notNull()
    .references(() => tCards.id, { onDelete: "cascade" }),
});

export type MarketOfferStatus = "pending" | "accepted" | "cancelled";

export const marketOffers = pgTable("MarketOffer", {
  id: serial("id").primaryKey(),
  listingId: integer("listingId")
    .notNull()
    .references(() => marketListings.id, { onDelete: "cascade" }),
  buyerId: text("buyerId")
    .notNull()
    .references(() => tgUsers.id, { onDelete: "cascade" }),
  status: text("status")
    .$type<MarketOfferStatus>()
    .notNull()
    .default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const marketOfferCards = pgTable("MarketOfferCards", {
  offerId: integer("offerId")
    .notNull()
    .references(() => marketOffers.id, { onDelete: "cascade" }),
  cardId: text("cardId")
    .notNull()
    .references(() => tCards.id, { onDelete: "cascade" }),
});

export type SelectMarketListing = typeof marketListings.$inferSelect;
export type InsertMarketListing = typeof marketListings.$inferInsert;
export type SelectMarketOffer = typeof marketOffers.$inferSelect;
export type InsertMarketOffer = typeof marketOffers.$inferInsert;
