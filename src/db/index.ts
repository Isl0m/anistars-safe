import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

if (!process.env.DATABASE_DRIZZLE_URL) {
  throw new Error("DATABASE_DRIZZLE_URL not set");
}

const client = postgres(process.env.DATABASE_DRIZZLE_URL, {
  max: 5,
  idle_timeout: 300,
  max_lifetime: 60 * 60,
});

export const db = drizzle(client);
