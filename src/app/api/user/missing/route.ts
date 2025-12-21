import { getUser, getUserMissingCardsWithFilter } from "@/lib/queries";

import { Filter } from "@/components/get-filte-options";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return new Response("id param required", {
      status: 400,
    });
  const user = await getUser(id);
  if (!user) return new Response("user not found", { status: 404 });
  const body = (await request.json()) as Filter | undefined;
  const cards = await getUserMissingCardsWithFilter(id, body ?? undefined);

  return new Response(
    JSON.stringify({
      user,
      cards,
    })
  );
}
