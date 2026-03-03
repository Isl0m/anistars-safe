import { getUser } from "@/lib/queries";

import { SearchFirstProfile, SearchProfile } from "@/components/pages/profile";

export default async function Profile({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const userId = searchParams.userId && String(searchParams.userId);
  if (!userId) return <SearchFirstProfile />;

  const user = await getUser(userId);

  if (!user) return <SearchFirstProfile />;

  return <SearchProfile user={user} />;
}
