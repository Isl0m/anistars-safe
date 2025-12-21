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
  // if (user.isInvisible) {
  //   return (
  //     <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
  //       <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
  //         Этот профиль инкогнито
  //       </h1>
  //     </main>
  //   );
  // }

  return <SearchProfile user={user} />;
}
