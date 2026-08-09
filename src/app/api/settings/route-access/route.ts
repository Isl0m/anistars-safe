import { NextResponse } from "next/server";

import { errorResponse, requireAdmin } from "@/lib/api-utils";
import { getRouteAccessMap, setRouteAccess } from "@/lib/queries";
import { MANAGED_ROUTES } from "@/lib/route-access";

const MANAGED_PATHS = new Set(MANAGED_ROUTES.map((r) => r.path));

export async function GET() {
  const access = await getRouteAccessMap();
  return NextResponse.json({ access });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const { path, access } = await request.json().catch(() => ({}));

  if (!MANAGED_PATHS.has(path)) {
    return errorResponse("Unknown or non-managed route", 400);
  }
  if (access !== "all" && access !== "admin") {
    return errorResponse("access must be 'all' or 'admin'", 400);
  }

  await setRouteAccess(path, access);
  return NextResponse.json({ access: await getRouteAccessMap() });
}
