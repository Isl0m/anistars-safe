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

export type FilterOption = {
  key: FilterOptionKey;
  name: string;
  items: { id: number | string; name: string }[];
  span?: number;
};

export type SortOptions =
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
    { id: "power&heal", name: "Урон&Хил" },
    { id: "reflect", name: "Отражение" },
    { id: "dodge", name: "Уклонение" },
  ],
};

const sortOptions: FilterOption = {
  key: "sort",
  name: "Сортировка",
  items: [
    { id: "createdAt-desc", name: "Сначала новые" },
    { id: "createdAt-asc", name: "Сначала старые" },
    { id: "price-asc", name: "Сначала дешевые" },
    { id: "price-desc", name: "Сначала дорогие" },
    { id: "quantity-asc", name: "Малое количество" },
    { id: "quantity-desc", name: "Большое количество" },
  ],
};

export async function getFilterOptions() {
  const [rarities, classes, universes, authors] = await Promise.all([
    getRarities(),
    getClasses(),
    getUniverses(),
    getAuthors(),
  ]);

  const filterOptions: FilterOption[] = [
    {
      key: "rarityIds",
      name: "Редкость",
      items: rarities,
    },
    {
      key: "classIds",
      name: "Класс",
      items: classes,
    },
    {
      key: "universeIds",
      name: "Вселенная",
      items: universes,
      span: 2,
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
  return filterOptions;
}

export async function getUserFilterOptions(userId: string) {
  const [rarities, classes, universes, authors] = await Promise.all([
    getRarities(),
    getClasses(),
    getUserUniverses(userId),
    getAuthors(),
  ]);

  const filterOptions: FilterOption[] = [
    {
      key: "rarityIds",
      name: "Редкость",
      items: rarities,
    },
    {
      key: "classIds",
      name: "Класс",
      items: classes,
    },
    {
      key: "universeIds",
      name: "Вселенная",
      items: universes,
      span: 2,
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
  return filterOptions;
}
