import { getCardUpgrades } from "@/lib/queries";

export async function GET() {
  const upgrdes = await getCardUpgrades();
  return new Response(JSON.stringify({ upgrdes }));
}
