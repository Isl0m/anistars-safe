import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { tAuthors } from "@/db/schema/author";
import { tCards, tClasses, tRarities, tUniverses } from "@/db/schema/card";
import { tgUsers } from "@/db/schema/user";

export async function getRarities() {
  return db.select().from(tRarities).orderBy(tRarities.chance);
}

export async function getClasses() {
  return db.select().from(tClasses);
}

export async function getUniverses() {
  return db.select().from(tUniverses);
}

export async function getCards() {
  return db.select().from(tCards).orderBy(desc(tCards.createdAt));
}

export async function getAuthors() {
  return db.select().from(tAuthors);
}

export async function getUser(id: string) {
  return db
    .select()
    .from(tgUsers)
    .where(eq(tgUsers.id, id))
    .then((res) => res[0] ?? null);
}
