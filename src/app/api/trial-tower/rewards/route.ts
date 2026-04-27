import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

import { getTrialTowerRewards } from "@/lib/queries";

export const dynamic = "force-dynamic";

const getCachedTrialTowerRewards = unstable_cache(
  getTrialTowerRewards,
  ["trial-tower-rewards"],
  { revalidate: 60 }
);

export async function GET() {
  const rewards = await getCachedTrialTowerRewards();

  return NextResponse.json(
    { rewards },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
