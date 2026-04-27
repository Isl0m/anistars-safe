import { getTrialTowerRewards } from "@/lib/queries";

import { TrialTowerPage } from "@/components/pages/trial-tower";

export const revalidate = 60;

export default async function TrialTower() {
  const rewards = await getTrialTowerRewards();
  return <TrialTowerPage initialRewards={rewards} />;
}
