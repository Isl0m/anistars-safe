import { Queue, QueueEvents } from "bullmq";

export type MarketJob =
  | { type: "market-accept"; offerId: number; sellerId: string }
  | { type: "market-cancel-offer"; offerId: number; buyerId: string }
  | { type: "market-reject-offer"; offerId: number; sellerId: string }
  | { type: "market-cancel-listing"; listingId: number; sellerId: string };

const QUEUE_KEY = "tradeConfirmation";

const connection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
};

const queue = new Queue(QUEUE_KEY, { connection });

const queueEvents = new QueueEvents(QUEUE_KEY, { connection });

export async function addMarketJob(job: MarketJob) {
  const added = await queue.add(QUEUE_KEY, job);
  return added.waitUntilFinished(queueEvents, 30_000);
}
