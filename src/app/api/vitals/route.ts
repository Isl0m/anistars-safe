import { NextResponse } from "next/server";

import { parseBody, requireAdmin, requireAuth } from "@/lib/api-utils";
import { getVitalSummary, recordVital } from "@/lib/queries";
import { normalizeVitalPath, vitalSchema } from "@/lib/vitals";

const SUMMARY_DAYS = 7;

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  return NextResponse.json({
    days: SUMMARY_DAYS,
    rows: await getVitalSummary(SUMMARY_DAYS),
  });
}

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;

  const body = await parseBody(request, vitalSchema);
  if ("error" in body) return body.error;

  await recordVital({ ...body.data, path: normalizeVitalPath(body.data.path) });
  return new NextResponse(null, { status: 204 });
}
