import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import type { VitalMetric } from "@/lib/vitals";

export const pageLoadMetrics = pgTable(
  "PageLoadMetric",
  {
    id: serial("id").primaryKey(),
    loadId: text("loadId"),
    path: text("path").notNull(),
    metric: text("metric").$type<VitalMetric>().notNull(),
    value: doublePrecision("value").notNull(),
    platform: text("platform"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("page_load_metric_created_idx").on(table.createdAt),
    index("page_load_metric_load_idx").on(table.loadId),
  ]
);

export const pageLoads = pgTable(
  "PageLoad",
  {
    id: text("id").primaryKey(),
    userId: text("userId"),
    ip: text("ip"),
    userAgent: text("userAgent"),
    acceptLanguage: text("acceptLanguage"),
    path: text("path").notNull(),

    platform: text("platform"),
    appVersion: text("appVersion"),
    startParam: text("startParam"),
    chatType: text("chatType"),
    fullscreen: boolean("fullscreen"),
    languageCode: text("languageCode"),
    isPremium: boolean("isPremium"),

    language: text("language"),
    timezone: text("timezone"),
    connection: text("connection"),
    downlink: doublePrecision("downlink"),
    rtt: doublePrecision("rtt"),
    saveData: boolean("saveData"),
    deviceMemory: doublePrecision("deviceMemory"),
    cpuCores: integer("cpuCores"),
    screen: text("screen"),
    viewport: text("viewport"),

    navigationType: text("navigationType"),
    protocol: text("protocol"),
    dns: doublePrecision("dns"),
    connect: doublePrecision("connect"),
    download: doublePrecision("download"),
    domInteractive: doublePrecision("domInteractive"),
    domContentLoaded: doublePrecision("domContentLoaded"),
    loadEvent: doublePrecision("loadEvent"),
    documentBytes: integer("documentBytes"),
    jsBytes: integer("jsBytes"),
    resourceCount: integer("resourceCount"),
    cachedResources: integer("cachedResources"),

    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("page_load_created_idx").on(table.createdAt),
    index("page_load_user_idx").on(table.userId),
  ]
);
