import { getTableColumns, sql } from "drizzle-orm";

import { tAuthors } from "@/db/schema/author";
import {
  tCards,
  tClasses,
  Technique,
  tRarities,
  tTechniques,
  tUniverses,
} from "@/db/schema/card";
import { tgUsers } from "@/db/schema/user";

export const techniquesSql = sql<Technique[]>`COALESCE(
  (
    SELECT json_agg(t)
    FROM unnest(${tCards.techniqueIds}) AS tid
    JOIN ${tTechniques} t ON t.id = tid
  ),
  '[]'::json
)`;

export const cardDetailColumns = {
  ...getTableColumns(tCards),
  rarity: tRarities.name,
  universe: tUniverses.name,
  class: tClasses.name,
  author: tAuthors.username,
};

export const cardBaseColumns = getTableColumns(tCards);

export const cardPreviewColumns = {
  id: tCards.id,
  name: tCards.name,
  image: tCards.image,
};

export const userPublicColumns = {
  id: tgUsers.id,
  name: tgUsers.name,
  photoUrl: tgUsers.photoUrl,
};

// Map.groupBy needs Node 21+; production runs Node 20.
export function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = groups.get(k);
    if (group) group.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}
