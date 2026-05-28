import {
  getAuthors,
  getClasses,
  getRarities,
  getUniverses,
  getUserUniverses,
} from "@/lib/queries";

import { CardStats } from "@/db/schema/card";

export type FilterOptionKey =
  | "rarityIds"
  | "classIds"
  | "universeIds"
  | "authorIds"
  | "stats"
  | "droppable"
  | "techniques"
  | "sort";

export type FilterOptionItem = {
  id: number | string;
  name: string;
  group?: string;
};

export type FilterOption = {
  key: FilterOptionKey;
  name: string;
  items: FilterOptionItem[];
};

export type ListingFilterOptionKey =
  | "rarityIds"
  | "classIds"
  | "universeIds"
  | "stats"
  | "type";

export type ListingFilterOption = {
  key: ListingFilterOptionKey;
  name: string;
  items: { id: number | string; name: string }[];
};

export type SortOptions =
  | "power-desc"
  | "power-asc"
  | "createdAt-asc"
  | "createdAt-desc"
  | "price-asc"
  | "price-desc"
  | "quantity-asc"
  | "quantity-desc";

export type Filter = {
  rarityIds: number[];
  classIds: number[];
  universeIds: number[];
  authorIds: number[];
  stats: CardStats[];
  droppable: string[];
  techniques: string[];
  sort: SortOptions;
  minPrice?: number;
};

export type ListingFilters = {
  classIds: number[];
  rarityIds: number[];
  universeIds: number[];
  type: string[];
  stats: CardStats[];
  minCardPrice?: number;
  minCardCount?: number;
  maxCardCount?: number;
};

export type TechniqueType =
  | "power"
  | "heal"
  | "power+heal"
  | "dodge"
  | "reflect";

const statsOptions: FilterOption = {
  key: "stats",
  name: "Характеристики",
  items: [
    { id: "full", name: "Фулл" },
    { id: "pre-full", name: "Пре-Фулл" },
    { id: "basic", name: "Базовый" },
  ],
};

const typeOptions: FilterOption = {
  key: "droppable",
  name: "Тип",
  items: [
    { id: "limited", name: "Лимитированный" },
    { id: "basic", name: "Базовый" },
    { id: "upgradable", name: "Улучшаемый" },
    { id: "upgrade", name: "Улучшение" },
  ],
};

const techniqueOptions: FilterOption = {
  key: "techniques",
  name: "Техника",
  items: [
    { id: "power", name: "Урон" },
    { id: "heal", name: "Хил" },
    { id: "power+heal", name: "Урон&Хил" },
    { id: "reflect", name: "Отражение" },
    { id: "dodge", name: "Уклонение" },
  ],
};

const sortOptions: FilterOption = {
  key: "sort",
  name: "Сортировка",
  items: [
    { id: "power-desc", name: "Сначала сильные" },
    { id: "power-asc", name: "Сначала слабые" },
    { id: "createdAt-desc", name: "Сначала новые" },
    { id: "createdAt-asc", name: "Сначала старые" },
    { id: "price-asc", name: "Сначала дешевые" },
    { id: "price-desc", name: "Сначала дорогие" },
    { id: "quantity-asc", name: "Малое количество" },
    { id: "quantity-desc", name: "Большое количество" },
  ],
};

const listingStatsOptions: ListingFilterOption = {
  key: "stats",
  name: "Характеристики",
  items: statsOptions.items,
};

const listingTypeOptions: ListingFilterOption = {
  key: "type",
  name: "Тип",
  items: typeOptions.items,
};

async function fetchBaseData() {
  return Promise.all([getRarities(), getClasses(), getUniverses(), getAuthors()]);
}

const universeTypeLabels: Record<string, string> = {
  basic: "Базовые",
  chromo: "Хромо",
  event: "Ивентовые",
  limited: "Лимитированные",
};

function buildFilterOptions(
  rarities: Awaited<ReturnType<typeof getRarities>>,
  classes: Awaited<ReturnType<typeof getClasses>>,
  universes: { id: number; name: string; type?: string }[],
  authors: Awaited<ReturnType<typeof getAuthors>>
): FilterOption[] {
  return [
    { key: "rarityIds", name: "Редкость", items: rarities },
    { key: "classIds", name: "Класс", items: classes },
    {
      key: "universeIds",
      name: "Вселенная",
      items: universes.map((u) => ({
        id: u.id,
        name: u.name,
        group: universeTypeLabels[u.type ?? "basic"] ?? u.type,
      })),
    },
    statsOptions,
    typeOptions,
    {
      key: "authorIds",
      name: "Автор",
      items: authors.map(({ id, username }) => ({ id, name: username })),
    },
    techniqueOptions,
    sortOptions,
  ];
}

export async function getFilterOptions() {
  const [rarities, classes, universes, authors] = await fetchBaseData();
  return buildFilterOptions(rarities, classes, universes, authors);
}

export async function getUserFilterOptions(userId: string) {
  const [rarities, classes, authors, universes] = await Promise.all([
    getRarities(),
    getClasses(),
    getAuthors(),
    getUserUniverses(userId),
  ]);
  return buildFilterOptions(rarities, classes, universes, authors);
}

export async function getListingFilterOptions() {
  const [rarities, classes, universes, authors] = await fetchBaseData();

  const filterOptions = buildFilterOptions(rarities, classes, universes, authors);

  const listingFilterOptions: ListingFilterOption[] = [
    { key: "rarityIds", name: "Редкость", items: rarities },
    { key: "classIds", name: "Класс", items: classes },
    { key: "universeIds", name: "Вселенная", items: universes },
    listingStatsOptions,
    listingTypeOptions,
  ];

  return { filterOptions, listingFilterOptions };
}
