import { gt, sql } from "drizzle-orm";

import type { Vital, VitalMetric } from "@/lib/vitals";

import { db } from "@/db";
import { pageLoadMetrics } from "@/db/schema/vitals";

export async function recordVital(vital: Vital) {
  await db.insert(pageLoadMetrics).values(vital);
}

export type VitalSummaryRow = {
  path: string;
  metric: VitalMetric;
  count: number;
  p50: number;
  p75: number;
};

export async function getVitalSummary(days: number) {
  return db
    .select({
      path: pageLoadMetrics.path,
      metric: pageLoadMetrics.metric,
      count: sql<number>`count(*)`.mapWith(Number),
      p50: sql<number>`percentile_cont(0.5) within group (order by ${pageLoadMetrics.value})`.mapWith(
        Number
      ),
      p75: sql<number>`percentile_cont(0.75) within group (order by ${pageLoadMetrics.value})`.mapWith(
        Number
      ),
    })
    .from(pageLoadMetrics)
    .where(
      gt(pageLoadMetrics.createdAt, sql`now() - make_interval(days => ${days})`)
    )
    .groupBy(pageLoadMetrics.path, pageLoadMetrics.metric);
}
