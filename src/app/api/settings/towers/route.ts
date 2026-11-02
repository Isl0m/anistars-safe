import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, parseBody, requireAdmin } from "@/lib/api-utils";
import { getEventTowers, setEventTowerEnabled } from "@/lib/queries";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  return NextResponse.json({ towers: await getEventTowers() });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const body = await parseBody(
    request,
    z.object({ id: z.number().int().positive(), enabled: z.boolean() })
  );
  if ("error" in body) return body.error;

  const saved = await setEventTowerEnabled(body.data.id, body.data.enabled);
  if (!saved) return errorResponse("Башня не найдена", 404);
  return NextResponse.json({ towers: await getEventTowers() });
}
