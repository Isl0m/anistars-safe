import { NextResponse } from "next/server";

import { getCardUpgrades } from "@/lib/queries";

export async function GET() {
  const upgrdes = await getCardUpgrades();
  return NextResponse.json({ upgrdes });
}
