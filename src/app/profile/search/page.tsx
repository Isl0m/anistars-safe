import { getUser, getUserCards } from "@/lib/queries";

import { getFilterOptions } from "@/components/get-filte-options";
import { SearchFirstProfile, SearchProfile } from "@/components/profile";

export default async function Profile({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const userId = searchParams.userId && String(searchParams.userId);
  if (!userId) return <SearchFirstProfile />;

  const user = await getUser(userId);
  const userCards = await getUserCards(userId);

  const filterOptions = await getFilterOptions();
  return (
    <SearchProfile
      userId={userId}
      user={user}
      cards={userCards}
      filterOptions={filterOptions}
    />
  );
}
