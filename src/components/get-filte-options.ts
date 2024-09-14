import {
  getAuthors,
  getClasses,
  getRarities,
  getUniverses,
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
  const rarities = await getRarities();
  const classes = await getClasses();
  const universes = await getUniverses();
  const authors = await getAuthors();

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
        { id: "dodge", name: "Уклонение" },
      ],
    },
  ];
  return filterOptions;
}
