import { boolean, integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const towers = pgTable("Tower", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sortOrder").notNull().default(0),
  enabled: boolean("enabled").notNull().default(false),
});

export type Tower = typeof towers.$inferSelect;
