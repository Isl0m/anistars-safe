"use client";

import { useEffect } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { retrieveLaunchParams } from "@telegram-apps/sdk-react";

import { api } from "@/lib/api";
import {
  PageLoadReport,
  Vital,
  VITAL_METRICS,
  VitalMetric,
} from "@/lib/vitals";

import { useTelegram } from "@/components/telegram-provider";

const isBrowser = typeof window !== "undefined";

const landingPath = isBrowser ? window.location.pathname : "/";

const loadId =
  isBrowser && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : null;

const isVitalMetric = (name: string): name is VitalMetric =>
  (VITAL_METRICS as readonly string[]).includes(name);

type DeviceNavigator = Navigator & {
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  deviceMemory?: number;
};

function launchParams() {
  try {
    return retrieveLaunchParams();
  } catch {
    return null;
  }
}

function send(url: string, body: Vital | PageLoadReport) {
  api
    .post(url, body, { adapter: "fetch", fetchOptions: { keepalive: true } })
    .catch(() => {});
}

const ignore = () => {};

const ms = (value: number) =>
  value >= 0 ? Math.min(Math.round(value), 600_000) : null;

function report({ name, value }: { name: string; value: number }) {
  if (!isVitalMetric(name)) return;
  const launch = launchParams();
  if (!launch) return;

  send("/api/vitals", {
    loadId,
    metric: name,
    value,
    path: landingPath,
    platform: launch.tgWebAppPlatform,
  });
}

function reportLoad() {
  const launch = launchParams();
  if (!launch || !loadId) return;

  const nav: DeviceNavigator = navigator;
  const [timing] = performance
    .getEntriesByType("navigation")
    .filter((e) => e instanceof PerformanceNavigationTiming);
  const ownResources = performance
    .getEntriesByType("resource")
    .filter((e) => e instanceof PerformanceResourceTiming)
    .filter((e) => e.name.startsWith(location.origin));
  const scripts = ownResources.filter((r) =>
    new URL(r.name).pathname.endsWith(".js")
  );

  send("/api/vitals/load", {
    id: loadId,
    path: landingPath,

    platform: launch.tgWebAppPlatform,
    appVersion: launch.tgWebAppVersion,
    startParam: launch.tgWebAppStartParam?.slice(0, 64) ?? null,
    chatType: launch.tgWebAppData?.chat_type ?? null,
    fullscreen: launch.tgWebAppFullscreen ?? null,
    languageCode: launch.tgWebAppData?.user?.language_code ?? null,
    isPremium: launch.tgWebAppData?.user?.is_premium ?? null,

    language: navigator.language.slice(0, 32),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 64),
    connection: nav.connection?.effectiveType ?? null,
    downlink: nav.connection?.downlink ?? null,
    rtt: nav.connection?.rtt ?? null,
    saveData: nav.connection?.saveData ?? null,
    deviceMemory: nav.deviceMemory ?? null,
    cpuCores: navigator.hardwareConcurrency ?? null,
    screen: `${screen.width}x${screen.height}@${window.devicePixelRatio}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,

    navigationType: timing?.type ?? null,
    protocol: timing?.nextHopProtocol || null,
    dns: timing ? ms(timing.domainLookupEnd - timing.domainLookupStart) : null,
    connect: timing ? ms(timing.connectEnd - timing.connectStart) : null,
    download: timing ? ms(timing.responseEnd - timing.responseStart) : null,
    domInteractive: timing ? ms(timing.domInteractive) : null,
    domContentLoaded: timing ? ms(timing.domContentLoadedEventEnd) : null,
    loadEvent: timing ? ms(timing.loadEventEnd) : null,
    documentBytes: timing?.transferSize ?? null,
    jsBytes: scripts.reduce((total, r) => total + r.transferSize, 0),
    resourceCount: ownResources.length,
    cachedResources: ownResources.filter(
      (r) => r.transferSize === 0 && r.decodedBodySize > 0
    ).length,
  });
}

export function WebVitals() {
  const { isTelegram } = useTelegram();
  useReportWebVitals(isTelegram ? report : ignore);

  useEffect(() => {
    if (!isTelegram) return;
    const onLoad = () => setTimeout(reportLoad, 0);
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, [isTelegram]);

  return null;
}
