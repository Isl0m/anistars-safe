export type Access = "all" | "admin";

export type RouteAccessMap = Record<string, Access>;

export const ROUTE_ACCESS_DEFAULTS: RouteAccessMap = {
  "/admin": "admin",
  "/market": "all",
  "/trade": "all",
};

export const MANAGED_ROUTES: { path: string; label: string }[] = [
  { path: "/market", label: "Маркетплейс" },
  { path: "/trade", label: "Трейд" },
];

const MANAGED_PATHS = new Set(MANAGED_ROUTES.map((r) => r.path));

export function buildAccessMap(overrides: RouteAccessMap): RouteAccessMap {
  const filtered = Object.fromEntries(
    Object.entries(overrides).filter(([path]) => MANAGED_PATHS.has(path))
  );
  return { ...ROUTE_ACCESS_DEFAULTS, ...filtered };
}

export function resolveAccess(map: RouteAccessMap, pathname: string): Access {
  const match = Object.keys(map)
    .filter((p) => pathname === p || pathname.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return match ? map[match] : "all";
}

export function canAccess(access: Access, type: string | undefined): boolean {
  if (access === "all") return true;
  return type === "admin";
}
