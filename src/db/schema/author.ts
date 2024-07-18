import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const tAuthors = pgTable("Author", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});
