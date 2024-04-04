import { getUser, getUserCards } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return new Response("id param required", {
      status: 400,
    });
  const user = await getUser(id);
  if (!user) return new Response("user not found", { status: 404 });
  const cards = await getUserCards(id);
  return new Response(
    JSON.stringify({
      user,
      cards,
    })
  );
}
