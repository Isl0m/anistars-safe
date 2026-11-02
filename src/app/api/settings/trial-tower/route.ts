import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, parseBody, requireAdmin } from "@/lib/api-utils";
import { getTrialTowerEnabled, setTrialTowerEnabled } from "@/lib/queries";

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  return NextResponse.json({ enabled: await getTrialTowerEnabled() });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const body = await parseBody(request, z.object({ enabled: z.boolean() }));
  if ("error" in body) return body.error;

  const saved = await setTrialTowerEnabled(body.data.enabled);
  if (!saved) {
    return errorResponse("Настройка trial-tower не найдена в базе", 404);
  }
  return NextResponse.json({ enabled: body.data.enabled });
}
