import { Queue, QueueEvents } from "bullmq";
import type { InlineKeyboardMarkup } from "grammy/types";

import { redisConnection } from "@/lib/redis";

export type Currency = "coins" | "sparkles" | "astrals" | "event" | "tries";
export type UserRole = "admin" | "support" | "basic";
export type BroadcastAudience =
  "all" | "active1" | "active7" | "active30" | "premium" | "me";

/**
 * Mirrors `AdminJob` in anistars-bot/src/utils/adminQueue.ts — the bot worker
 * carries out every change so it runs through the same code as the chat
 * commands (premium pass tasks, clan deadline shifts, user notifications).
 */
export type AdminJob =
  | {
      type: "user-balance";
      userId: string;
      currency: Currency;
      amount: number;
      notify: boolean;
    }
  | { type: "user-premium"; userId: string; enabled: boolean }
  | { type: "user-ban"; userId: string; banned: boolean }
  | { type: "user-trade-ban"; userId: string; banned: boolean; days?: number }
  | { type: "user-role"; userId: string; role: UserRole }
  | { type: "user-clear-battle"; userId: string }
  | { type: "user-clear-stars"; userId: string }
  | { type: "user-give-card"; userId: string; cardSlug: string }
  | { type: "user-give-pack"; userId: string; packId: number }
  | { type: "user-give-title"; userId: string; titleId: number }
  | { type: "user-message"; userId: string; text: string }
  | {
      type: "feature-toggle";
      feature: "battle" | "clans" | "testMode";
      enabled: boolean;
    }
  | {
      type: "broadcast-start";
      batchTag: string;
      fromChatId: string;
      messageId: number;
      copy: boolean;
      replyMarkup?: InlineKeyboardMarkup;
      audience: BroadcastAudience;
      requestedBy: string;
    }
  | { type: "broadcast-retry"; batchTag: string };

export type AdminJobResult = { ok: boolean; message: string };

export type AdminJobOutcome =
  | { status: "done"; result: AdminJobResult }
  | { status: "pending" }
  | { status: "failed"; error: unknown };

const QUEUE_KEY = "adminActions";

const queue = new Queue<AdminJob>(QUEUE_KEY, {
  connection: redisConnection,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
});

const queueEvents = new QueueEvents(QUEUE_KEY, {
  connection: redisConnection,
});

/** Below the 15s axios timeout, same as the market jobs. */
const JOB_WAIT_MS = 12_000;

export async function addAdminJob(job: AdminJob): Promise<AdminJobOutcome> {
  let added;
  try {
    added = await queue.add(QUEUE_KEY, job);
  } catch (error) {
    return { status: "failed", error };
  }

  try {
    const result = (await added.waitUntilFinished(
      queueEvents,
      JOB_WAIT_MS
    )) as AdminJobResult;
    return { status: "done", result };
  } catch (error) {
    const state = await added.getState().catch(() => "unknown");
    if (state === "failed") return { status: "failed", error };
    return { status: "pending" };
  }
}

/** The bot's broadcast queue, for its counters and pause / resume / clear. */
let _broadcastQueue: Queue | undefined;
export function getBroadcastQueue() {
  return (_broadcastQueue ??= new Queue("broadcast", {
    connection: redisConnection,
  }));
}
