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
