import { db } from "@/db";
import { routeAccessSettings } from "@/db/schema/settings";
import {
  Access,
  buildAccessMap,
  resolveAccess,
  RouteAccessMap,
} from "@/lib/route-access";

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
