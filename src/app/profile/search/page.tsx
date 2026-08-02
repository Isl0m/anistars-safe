import { getPublicUser } from "@/lib/queries";

import { SearchFirstProfile, SearchProfile } from "@/components/pages/profile";

export default async function Profile(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const userId = searchParams.userId && String(searchParams.userId);
  if (!userId) return <SearchFirstProfile />;

  const user = await getPublicUser(userId);

  if (!user) return <SearchFirstProfile />;

  return <SearchProfile user={user} />;
}
