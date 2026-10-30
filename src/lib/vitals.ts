import { z } from "zod";

export const LOAD_METRICS = ["TTFB", "FCP", "LCP"] as const;

export const VITAL_METRICS = [...LOAD_METRICS, "INP", "CLS"] as const;

export type LoadMetric = (typeof LOAD_METRICS)[number];

export type VitalMetric = (typeof VITAL_METRICS)[number];

const path = z.string().startsWith("/").max(200);
const label = (max: number) => z.string().max(max).nullable().default(null);
const ms = z.number().finite().min(0).max(600_000).nullable().default(null);
const count = z
  .number()
  .int()
  .min(0)
  .max(2 ** 31 - 1)
  .nullable()
  .default(null);
const flag = z.boolean().nullable().default(null);

export const vitalSchema = z.object({
  loadId: z.uuid().nullable().default(null),
  metric: z.enum(VITAL_METRICS),
  value: z.number().finite().nonnegative().max(600_000),
  path,
  platform: z.string().max(32).nullable(),
});

export type Vital = z.input<typeof vitalSchema>;

export const pageLoadSchema = z.object({
  id: z.uuid(),
  path,

  platform: label(32),
  appVersion: label(16),
  startParam: label(64),
  chatType: label(16),
  fullscreen: flag,
  languageCode: label(16),
  isPremium: flag,

  language: label(32),
  timezone: label(64),
  connection: label(16),
  downlink: z.number().finite().min(0).max(10_000).nullable().default(null),
  rtt: ms,
  saveData: flag,
  deviceMemory: z.number().finite().min(0).max(1024).nullable().default(null),
  cpuCores: z.number().int().min(0).max(1024).nullable().default(null),
  screen: label(32),
  viewport: label(32),

  navigationType: label(16),
  protocol: label(16),
  dns: ms,
  connect: ms,
  download: ms,
  domInteractive: ms,
  domContentLoaded: ms,
  loadEvent: ms,
  documentBytes: count,
  jsBytes: count,
  resourceCount: count,
  cachedResources: count,
});

export type PageLoadReport = z.input<typeof pageLoadSchema>;

export const normalizeVitalPath = (pathname: string) =>
  pathname.replace(/\/\d+(?=\/|$)/g, "/[id]");
