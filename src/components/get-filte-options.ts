import {
    getAuthors,
    getClasses,
    getRarities,
    getUniverses,
    getUserUniverses,
} from "@/lib/queries";

export type FilterOptionKey =
  | "rarityId"
  | "classId"
  | "universeId"
  | "authorId"
  | "type"
  | "droppable"
  | "technique";

export type FilterOption = {
  key: FilterOptionKey;
  name: string;
  items: { id: number | string; name: string }[];
  span?: number;
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
      key: "rarityId",
      name: "Редкость",
      items: rarities,
    },
    {
      key: "classId",
      name: "Класс",
      items: classes,
    },
    {
      key: "universeId",
      name: "Вселенная",
      items: universes,
      span: 2,
    },
    {
      key: "type",
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
        { id: "false", name: "Лимитированный" },
        { id: "true", name: "Базовый" },
      ],
    },
    {
      key: "authorId",
      name: "Автор",
      items: authors.map(({ id, username }) => ({ id, name: username })),
    },
    {
      key: "technique",
      name: "Техника",
      items: [
        { id: "power", name: "Урон" },
        { id: "heal", name: "Хил" },
        { id: "power&heal", name: "Урон&Хил" },
        { id: "reflection", name: "Отражение" },
        { id: "dodge", name: "Уклонение" },
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
      key: "rarityId",
      name: "Редкость",
      items: rarities,
    },
    {
      key: "classId",
      name: "Класс",
      items: classes,
    },
    {
      key: "universeId",
      name: "Вселенная",
      items: universes,
      span: 2,
    },
    {
      key: "type",
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
        { id: "false", name: "Лимитированный" },
        { id: "true", name: "Базовый" },
      ],
    },
    {
      key: "authorId",
      name: "Автор",
      items: authors.map(({ id, username }) => ({ id, name: username })),
    },
    {
      key: "technique",
      name: "Техника",
      items: [
        { id: "power", name: "Урон" },
        { id: "heal", name: "Хил" },
        { id: "power&heal", name: "Урон&Хил" },
        { id: "reflection", name: "Отражение" },
        { id: "dodge", name: "Уклонение" },
      ],
    },
  ];
  return filterOptions;
}
