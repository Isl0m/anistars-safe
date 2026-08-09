import { eq } from "drizzle-orm";

import {
  DEFAULT_MARKET_PROMO_SETTINGS,
  MarketPromoSettings,
  marketPromoSettingsSchema,
} from "@/lib/market-schemas";
import {
  Access,
  buildAccessMap,
  resolveAccess,
  RouteAccessMap,
} from "@/lib/route-access";

import { db } from "@/db";
import { appSettings, routeAccessSettings } from "@/db/schema/settings";

export async function getRouteAccessMap(): Promise<RouteAccessMap> {
  const rows = await db.select().from(routeAccessSettings);
  const overrides = Object.fromEntries(
    rows.map((r) => [r.path, r.access])
  ) as RouteAccessMap;
  return buildAccessMap(overrides);
}

export async function getAccessFor(pathname: string): Promise<Access> {
  return resolveAccess(await getRouteAccessMap(), pathname);
}

export async function setRouteAccess(path: string, access: Access) {
  await db
    .insert(routeAccessSettings)
    .values({ path, access })
    .onConflictDoUpdate({
      target: routeAccessSettings.path,
      set: { access, updatedAt: new Date() },
    });
}

const MARKET_PROMO_KEY = "market-promo";

export async function getMarketPromoSettings(): Promise<MarketPromoSettings> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, MARKET_PROMO_KEY));

  const parsed = marketPromoSettingsSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : DEFAULT_MARKET_PROMO_SETTINGS;
}

export async function setMarketPromoSettings(settings: MarketPromoSettings) {
  await db
    .insert(appSettings)
    .values({ key: MARKET_PROMO_KEY, value: settings })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: settings, updatedAt: new Date() },
    });
}
