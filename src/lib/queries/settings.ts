import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

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
import { tCards } from "@/db/schema/card";
import { appSettings, routeAccessSettings } from "@/db/schema/settings";
import { shopPageCards, shopPages } from "@/db/schema/shop";
import { towers } from "@/db/schema/tower";

export async function getRouteAccessMap(): Promise<RouteAccessMap> {
  const [rows, trialTowerEnabled] = await Promise.all([
    db.select().from(routeAccessSettings),
    getTrialTowerEnabled(),
  ]);
  const overrides = Object.fromEntries(
    rows.map((r) => [r.path, r.access])
  ) as RouteAccessMap;
  return {
    ...buildAccessMap(overrides),
    "/trial-tower": trialTowerEnabled ? "all" : "admin",
  };
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

const TRIAL_TOWER_KEY = "trial-tower";

export async function getTrialTowerEnabled(): Promise<boolean> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, TRIAL_TOWER_KEY));

  const parsed = z.object({ enabled: z.boolean() }).safeParse(row?.value);
  return parsed.success && parsed.data.enabled;
}

export async function setTrialTowerEnabled(enabled: boolean): Promise<boolean> {
  const updated = await db
    .update(appSettings)
    .set({
      value: sql`jsonb_set(${appSettings.value}, '{enabled}', to_jsonb(${enabled}::boolean))`,
      updatedAt: new Date(),
    })
    .where(eq(appSettings.key, TRIAL_TOWER_KEY))
    .returning({ key: appSettings.key });
  return updated.length > 0;
}

export async function getEventTowers() {
  return db
    .select({ id: towers.id, name: towers.name, enabled: towers.enabled })
    .from(towers)
    .orderBy(asc(towers.sortOrder), asc(towers.id));
}

export async function setEventTowerEnabled(
  id: number,
  enabled: boolean
): Promise<boolean> {
  const updated = await db
    .update(towers)
    .set({ enabled })
    .where(eq(towers.id, id))
    .returning({ id: towers.id });
  return updated.length > 0;
}

export async function getShopPages() {
  const [pages, cards] = await Promise.all([
    db
      .select({
        id: shopPages.id,
        shop: shopPages.shop,
        poster: shopPages.poster,
        icon: shopPages.icon,
        enabled: shopPages.isActive,
      })
      .from(shopPages)
      .orderBy(asc(shopPages.shop), asc(shopPages.position), asc(shopPages.id)),
    db
      .select({ pageId: shopPageCards.pageId, name: tCards.name })
      .from(shopPageCards)
      .innerJoin(tCards, eq(tCards.id, shopPageCards.cardId))
      .orderBy(asc(shopPageCards.position), asc(shopPageCards.id)),
  ]);
  return pages.map((page) => ({
    ...page,
    cards: cards.filter((c) => c.pageId === page.id).map((c) => c.name),
  }));
}

export async function setShopPageEnabled(
  id: number,
  enabled: boolean
): Promise<boolean> {
  const updated = await db
    .update(shopPages)
    .set({ isActive: enabled })
    .where(eq(shopPages.id, id))
    .returning({ id: shopPages.id });
  return updated.length > 0;
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
