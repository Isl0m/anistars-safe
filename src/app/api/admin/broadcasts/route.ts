import { NextResponse } from "next/server";
import { z } from "zod";

import { requireOwner, runAdminJob } from "@/lib/admin/api";
import {
  batchTagSchema,
  buttonSchema,
  buttonsMarkup,
  defaultBatchTag,
} from "@/lib/admin/broadcast";
import { broadcastExists, listBroadcasts } from "@/lib/admin/queries";
import { getBroadcastQueue } from "@/lib/admin/queue";
import { errorResponse, parseBody } from "@/lib/api-utils";

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const queue = getBroadcastQueue();
  const [broadcasts, counts, paused] = await Promise.all([
    listBroadcasts(),
    queue
      .getJobCounts("waiting", "active", "delayed", "prioritized", "paused")
      .catch(() => null),
    queue.isPaused().catch(() => null),
  ]);
  return NextResponse.json({ broadcasts, queue: { counts, paused } });
}

const audience = z.enum([
  "all",
  "active1",
  "active7",
  "active30",
  "premium",
  "me",
]);

const startSchema = z.discriminatedUnion("mode", [
  // A message composed in the panel and already sent to the owner as preview.
  z.object({
    mode: z.literal("copy"),
    messageId: z.number().int().positive(),
    buttons: buttonSchema.array().max(8).default([]),
    audience,
    batchTag: batchTagSchema.optional(),
  }),
  // A post in a channel the bot can read, forwarded like /broadcastMsg does.
  z.object({
    mode: z.literal("forward"),
    fromChatId: z
      .string()
      .trim()
      .regex(/^(-?\d+|@\w{4,})$/),
    messageId: z.number().int().positive(),
    audience,
    batchTag: batchTagSchema.optional(),
  }),
]);

export async function POST(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const parsed = await parseBody(request, startSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const batchTag = body.batchTag || defaultBatchTag();
  if (await broadcastExists(batchTag)) {
    return errorResponse("Рассылка с таким тегом уже есть", 409);
  }

  return runAdminJob(owner.ownerId, {
    type: "broadcast-start",
    batchTag,
    audience: body.audience,
    messageId: body.messageId,
    requestedBy: owner.ownerId,
    ...(body.mode === "copy"
      ? {
          fromChatId: owner.ownerId,
          copy: true,
          replyMarkup: buttonsMarkup(body.buttons),
        }
      : { fromChatId: body.fromChatId, copy: false }),
  });
}
