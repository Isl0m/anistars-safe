import { NextResponse } from "next/server";
import { z } from "zod";

import { requireOwner, runAdminJob } from "@/lib/admin/api";
import { getFeatureFlags } from "@/lib/admin/queries";
import { parseBody } from "@/lib/api-utils";

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;
  return NextResponse.json({ features: await getFeatureFlags() });
}

const schema = z.object({
  feature: z.enum(["battle", "clans", "testMode"]),
  enabled: z.boolean(),
});

export async function POST(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const parsed = await parseBody(request, schema);
  if ("error" in parsed) return parsed.error;
  return runAdminJob(owner.ownerId, {
    type: "feature-toggle",
    ...parsed.data,
  });
}
