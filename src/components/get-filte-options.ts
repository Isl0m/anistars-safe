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
  | "price-desc";

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
    {
      key: "stats",
      name: "Характеристики",
      items: [
        { id: "full", name: "Фулл" },
        { id: "pre-full", name: "Пре-Фулл" },
        { id: "basic", name: "Базовый" },
      ],
    },
    {
      key: "droppable",
      name: "Тип",
      items: [
        { id: "limited", name: "Лимитированный" },
        { id: "basic", name: "Базовый" },
        { id: "upgradable", name: "Улучшаемый" },
        { id: "upgrade", name: "Улучшение" },
      ],
    },
    {
      key: "authorIds",
      name: "Автор",
      items: authors.map(({ id, username }) => ({ id, name: username })),
    },
    {
      key: "techniques",
      name: "Техника",
      items: [
        { id: "power", name: "Урон" },
        { id: "heal", name: "Хил" },
        { id: "power&heal", name: "Урон&Хил" },
        { id: "reflection", name: "Отражение" },
        { id: "dodge", name: "Уклонение" },
      ],
    },
    {
      key: "sort",
      name: "Сортировка",
      items: [
        { id: "createdAt-desc", name: "Сначала новые" },
        { id: "createdAt-asc", name: "Сначала старые" },
        { id: "price-asc", name: "Сначала дешевые" },
        { id: "price-desc", name: "Сначала дорогие" },
      ],
    },
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
    {
      key: "stats",
      name: "Характеристики",
      items: [
        { id: "full", name: "Фулл" },
        { id: "pre-full", name: "Пре-Фулл" },
        { id: "basic", name: "Базовый" },
      ],
    },
    {
      key: "droppable",
      name: "Тип",
      items: [
        { id: "limited", name: "Лимитированный" },
        { id: "basic", name: "Базовый" },
        { id: "upgradable", name: "Улучшаемый" },
        { id: "upgrade", name: "Улучшение" },
      ],
    },
    {
      key: "authorIds",
      name: "Автор",
      items: authors.map(({ id, username }) => ({ id, name: username })),
    },
    {
      key: "techniques",
      name: "Техника",
      items: [
        { id: "power", name: "Урон" },
        { id: "heal", name: "Хил" },
        { id: "power&heal", name: "Урон&Хил" },
        { id: "reflection", name: "Отражение" },
        { id: "dodge", name: "Уклонение" },
      ],
    },
    {
      key: "sort",
      name: "Сортировка",
      items: [
        { id: "createdAt-asc", name: "Сначала новые" },
        { id: "createdAt-desc", name: "Сначала старые" },
        { id: "price-asc", name: "Сначала дешевые" },
        { id: "price-desc", name: "Сначала дорогие" },
      ],
    },
  ];
  return filterOptions;
}
