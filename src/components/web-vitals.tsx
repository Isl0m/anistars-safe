"use client";

import { useReportWebVitals } from "next/web-vitals";
import { retrieveLaunchParams } from "@telegram-apps/sdk-react";

import { api } from "@/lib/api";
import { Vital, VITAL_METRICS, VitalMetric } from "@/lib/vitals";

const landingPath =
  typeof window === "undefined" ? "/" : window.location.pathname;

const isVitalMetric = (name: string): name is VitalMetric =>
  (VITAL_METRICS as readonly string[]).includes(name);

function report({ name, value }: { name: string; value: number }) {
  if (!isVitalMetric(name)) return;

  let platform: string;
  try {
    platform = retrieveLaunchParams().tgWebAppPlatform;
  } catch {
    return;
  }

  const vital: Vital = { metric: name, value, path: landingPath, platform };
  api
    .post("/api/vitals", vital, {
      adapter: "fetch",
      fetchOptions: { keepalive: true },
    })
    .catch(() => {});
}

export function WebVitals() {
  useReportWebVitals(report);
  return null;
}
