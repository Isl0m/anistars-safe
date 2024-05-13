import {
  getAuthors,
  getCards,
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
  | "droppable";

export type FilterOption = {
  key: FilterOptionKey;
  name: string;
  items: { id: number | string; name: string }[];
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
    },
    {
      key: "authorId",
      name: "Автор",
      items: authors.map(({ id, username }) => ({ id, name: username })),
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
      key: "type",
      name: "Характеристики",
      items: [
        { id: "full", name: "Фулл" },
        { id: "pre-full", name: "Пре-Фулл" },
        { id: "basic", name: "Базовый" },
      ],
    },
  ];
  return filterOptions;
}
