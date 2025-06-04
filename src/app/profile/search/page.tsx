import { Suspense } from "react";

import { getUser, getUserCards } from "@/lib/queries";

import { CardsList } from "@/components/cards-list";
import { getUserFilterOptions } from "@/components/get-filte-options";
import { SearchFirstProfile } from "@/components/pages/profile";

export default async function Profile({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const userId = searchParams.userId && String(searchParams.userId);
  if (!userId) return <SearchFirstProfile />;

  const user = await getUser(userId);

  if (!user) return <SearchFirstProfile />;
  const userCards = await getUserCards(userId);

  const filterOptions = await getUserFilterOptions(userId);

  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <Suspense>
        {userCards?.length ? (
          <CardsList
            title={user.name}
            cards={userCards}
            filterOptions={filterOptions}
          />
        ) : (
          "Нет карт для отображения"
        )}
      </Suspense>
    </main>
  );
}
