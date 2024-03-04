import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const tAuthors = pgTable("Author", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  isAdmin: boolean("isAdmin").default(false),
  isVerified: boolean("isVerified").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
});
