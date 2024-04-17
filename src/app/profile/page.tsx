import {
  getAuthors,
  getClasses,
  getRarities,
  getUniverses,
} from "@/lib/queries";

import { Profile } from "@/components/profile";

import { FilterOption } from "../page";

export default async function ProfilePage() {
  const rarities = await getRarities();
  const classes = await getClasses();
  const universes = await getUniverses();
  const authors = await getAuthors();
  if (!rarities || !classes || !universes || !authors) {
    return (
      <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
        <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
          Something went wrong with fetching data
        </h1>
      </main>
    );
  }
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
  ];
  return <Profile filterOptions={filterOptions} />;
}
