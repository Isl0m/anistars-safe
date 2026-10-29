import Redis from "ioredis";

/** Shared with the bot: same host and keys as anistars-bot/src/lib/redis.ts. */
export const redisConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null,
};

let _redis: Redis | undefined;

export function getRedis() {
  return (_redis ??= new Redis(redisConnection));
}
