import { NextResponse } from "next/server";

import { parseBody, requireAuth } from "@/lib/api-utils";
import { recordPageLoad } from "@/lib/queries";
import { normalizeVitalPath, pageLoadSchema } from "@/lib/vitals";

const header = (request: Request, name: string, max: number) =>
  request.headers.get(name)?.slice(0, max) ?? null;

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;

  const body = await parseBody(request, pageLoadSchema);
  if ("error" in body) return body.error;

  await recordPageLoad({
    ...body.data,
    path: normalizeVitalPath(body.data.path),
    userId: authResult.auth.id,
    ip: header(request, "x-real-ip", 64),
    userAgent: header(request, "user-agent", 512),
    acceptLanguage: header(request, "accept-language", 128),
  });
  return new NextResponse(null, { status: 204 });
}
