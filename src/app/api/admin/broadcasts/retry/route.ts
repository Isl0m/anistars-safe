import { z } from "zod";

import { requireOwner, runAdminJob } from "@/lib/admin/api";
import { parseBody } from "@/lib/api-utils";

// Tags made by /broadcastMsg are free-form, so only the length is checked.
const schema = z.object({ batchTag: z.string().trim().min(3).max(100) });

export async function POST(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const parsed = await parseBody(request, schema);
  if ("error" in parsed) return parsed.error;

  return runAdminJob(owner.ownerId, {
    type: "broadcast-retry",
    batchTag: parsed.data.batchTag,
  });
}
