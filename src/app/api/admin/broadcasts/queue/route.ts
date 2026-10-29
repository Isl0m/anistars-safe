import { NextResponse } from "next/server";
import { z } from "zod";

import { logAdminAction, requireOwner } from "@/lib/admin/api";
import { getBroadcastQueue } from "@/lib/admin/queue";
import { parseBody } from "@/lib/api-utils";

const schema = z.object({ action: z.enum(["pause", "resume", "clear"]) });

/** Same as /pauseBroadcast, /resumeBroadcast and /clearBroadcast. */
export async function POST(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const parsed = await parseBody(request, schema);
  if ("error" in parsed) return parsed.error;
  const { action } = parsed.data;

  const queue = getBroadcastQueue();
  if (action === "pause") await queue.pause();
  if (action === "resume") await queue.resume();
  if (action === "clear") await queue.drain(true);

  await logAdminAction(owner.ownerId, `broadcast-${action}`, null);
  const message = {
    pause: "Рассылка приостановлена",
    resume: "Рассылка возобновлена",
    clear: "Очередь рассылки очищена",
  }[action];
  return NextResponse.json({ ok: true, message });
}
