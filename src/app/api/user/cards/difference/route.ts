import { getUser, getUserCardsDifference } from "@/lib/queries";

import { getUserFilterOptions } from "@/components/get-filte-options";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const secondId = searchParams.get("secondId");
  if (!id || !secondId)
    return new Response("id and secondId param required", {
      status: 400,
    });
  const user = await getUser(id);
  if (!user) return new Response("user not found", { status: 404 });
  const cards = await getUserCardsDifference(id, secondId);
  const filterOptions = await getUserFilterOptions(id);
  return new Response(
    JSON.stringify({
      user,
      cards,
      filterOptions,
    })
  );
}
