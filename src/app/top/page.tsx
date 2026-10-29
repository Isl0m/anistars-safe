import { getLeaderboards } from "@/lib/queries";

import { TopPage } from "@/components/pages/top";

// Every board scans a whole table, so the page is rebuilt at most every
// ten minutes rather than on each visit.
export const revalidate = 600;

export default async function Top() {
  const leaderboards = await getLeaderboards();
  return <TopPage leaderboards={leaderboards} />;
}
