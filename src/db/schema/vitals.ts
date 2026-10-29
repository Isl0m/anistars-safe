import {
  doublePrecision,
  index,
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
    path: text("path").notNull(),
    metric: text("metric").$type<VitalMetric>().notNull(),
    value: doublePrecision("value").notNull(),
    platform: text("platform"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("page_load_metric_created_idx").on(table.createdAt)]
);
