import { getTableColumns, sql } from "drizzle-orm";

import { tAuthors } from "@/db/schema/author";
import {
  cardMedia,
  CardMediaItem,
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

export const mediaSql = sql<CardMediaItem[]>`COALESCE(
  (
    SELECT json_agg(
      json_build_object('id', m.id, 'type', m.type, 'url', m.url)
      ORDER BY m."sortOrder", m.id
    )
    FROM ${cardMedia} m
    WHERE m."cardId" = ${tCards.id}
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
