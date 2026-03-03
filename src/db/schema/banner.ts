import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { tgUsers } from "./user";

export const banners = pgTable("Banner", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  file: text("file").notNull(),
  type: text("type").$type<"photo" | "video">().default("video").notNull(),
  isPrivate: boolean("isPrivate").default(false).notNull(),
});

export type Banner = typeof banners.$inferSelect;
export type BannerInsert = typeof banners.$inferInsert;

export const userBanners = pgTable(
  "UserBanner",
  {
    bannerId: integer("bannerId")
      .notNull()
      .references(() => banners.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => tgUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.bannerId, table.userId] }),
  })
);
