import { z } from "zod";

export const VITAL_METRICS = ["TTFB", "FCP", "LCP"] as const;

export type VitalMetric = (typeof VITAL_METRICS)[number];

export const vitalSchema = z.object({
  metric: z.enum(VITAL_METRICS),
  value: z.number().finite().nonnegative().max(600_000),
  path: z.string().startsWith("/").max(200),
  platform: z.string().max(32).nullable(),
});

export type Vital = z.infer<typeof vitalSchema>;

export const normalizeVitalPath = (pathname: string) =>
  pathname.replace(/\/\d+(?=\/|$)/g, "/[id]");
