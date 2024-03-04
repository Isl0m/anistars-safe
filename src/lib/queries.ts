import { desc } from "drizzle-orm";

import { db } from "@/db";
import { tAuthors } from "@/db/schema/author";
import { tCards, tClasses, tRarities, tUniverses } from "@/db/schema/card";

export async function getRarities() {
  return db.select().from(tRarities);
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
