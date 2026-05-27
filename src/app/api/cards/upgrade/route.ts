import { NextResponse } from "next/server";

import { getCardUpgrades } from "@/lib/queries";

export async function GET() {
  const upgrades = await getCardUpgrades();
  return NextResponse.json({ upgrades });
}
