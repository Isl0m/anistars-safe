import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { Access } from "@/lib/route-access";

export const routeAccessSettings = pgTable("RouteAccessSetting", {
  path: text("path").primaryKey(),
  access: text("access").$type<Access>().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const appSettings = pgTable("AppSetting", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
