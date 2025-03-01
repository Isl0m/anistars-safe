import { userTradeHistory } from "@/lib/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id)
    return new Response("id param required", {
      status: 400,
    });
  const tradeHistory = await userTradeHistory(id);
  if (!tradeHistory)
    return new Response("trade history not found", { status: 404 });
  return new Response(
    JSON.stringify({
      tradeHistory,
    })
  );
}
