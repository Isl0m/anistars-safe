import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { tAuthors } from "@/db/schema/author";
import {
  cardToTgUser,
  tCards,
  tClasses,
  tRarities,
  tUniverses,
} from "@/db/schema/card";
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

export async function getUserCards(id: string) {
  return db
    .select({
      id: tCards.id,
      name: tCards.name,
      slug: tCards.slug,
      image: tCards.image,
      rarityId: tCards.rarityId,
      classId: tCards.classId,
      universeId: tCards.universeId,
      authorId: tCards.authorId,
      createdAt: tCards.createdAt,
    })
    .from(cardToTgUser)
    .innerJoin(tCards, eq(cardToTgUser.cardId, tCards.id))
    .where(eq(cardToTgUser.tgUserId, id))
    .orderBy(desc(tCards.power), desc(tCards.power));
}
