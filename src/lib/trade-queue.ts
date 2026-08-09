import { Queue, QueueEvents } from "bullmq";

export type MarketJob =
  | { type: "market-accept"; offerId: number; sellerId: string }
  | { type: "market-cancel-offer"; offerId: number; buyerId: string }
  | { type: "market-reject-offer"; offerId: number; sellerId: string }
  | { type: "market-cancel-listing"; listingId: number; sellerId: string }
  | { type: "market-offer-notify"; offerId: number };

/**
 * What the bot worker resolves with. Mirrors `MarketJobResult` in
 * anistars-bot/src/lib/db/market/service.ts — the worker signals a business
 * refusal by returning `ok: false` rather than throwing, so a resolved promise
 * does not mean the trade happened.
 */
export type MarketJobResult = { ok: boolean; message: string };

export type MarketJobOutcome =
  | { status: "done"; result: MarketJobResult }
  /** The worker is still busy. The job usually completes right after. */
  | { status: "pending" }
  /** The worker threw, or the queue is unreachable. */
  | { status: "failed"; error: unknown };

const QUEUE_KEY = "tradeConfirmation";

const connection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
};

const queue = new Queue(QUEUE_KEY, {
  connection,
  // The bot sets these on its own Queue instance, but job options are attached
  // per producer — without this, jobs enqueued here are never cleaned up and
  // accumulate in Redis forever.
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
});

const queueEvents = new QueueEvents(QUEUE_KEY, { connection });

/**
 * Deliberately below the 15s axios timeout in `lib/api.ts`: if the worker is
 * backed up we want to answer the request ourselves with something truthful,
 * rather than let the client abort and report a failure for a job that is
 * still going to succeed.
 */
const JOB_WAIT_MS = 12_000;

/**
 * The seller is told about a new offer only after this delay, so a buyer who
 * offered by mistake has a window to cancel before anyone is pinged. The job
 * re-checks the offer is still pending before sending.
 */
const OFFER_NOTIFY_DELAY_MS = 30_000;

export async function scheduleOfferNotification(offerId: number) {
  await queue.add(
    QUEUE_KEY,
    { type: "market-offer-notify", offerId },
    { delay: OFFER_NOTIFY_DELAY_MS }
  );
}

export async function addMarketJob(job: MarketJob): Promise<MarketJobOutcome> {
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
    )) as MarketJobResult;
    return { status: "done", result };
  } catch (error) {
    // waitUntilFinished rejects both when the job fails and when the wait
    // times out; only the latter leaves the job alive.
    const state = await added.getState().catch(() => "unknown");
    if (state === "failed") return { status: "failed", error };
    return { status: "pending" };
  }
}
