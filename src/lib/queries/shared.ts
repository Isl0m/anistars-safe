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

// Only the fields the market UI renders for a card preview (image + name).
export const cardPreviewColumns = {
  id: tCards.id,
  name: tCards.name,
  image: tCards.image,
};

// Public-safe user fields. Avoids leaking the full TgUser row (coins,
// astrals, flags, etc.) when we only need to show an avatar + name.
export const userPublicColumns = {
  id: tgUsers.id,
  name: tgUsers.name,
  photoUrl: tgUsers.photoUrl,
};
