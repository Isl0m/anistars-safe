import { getCardUpgrades } from "@/lib/queries";

import { CardUpgradesPage } from "@/components/pages/upgrades";

export const revalidate = 900;

export default async function CardUpgrades() {
  const upgrades = await getCardUpgrades();
  return <CardUpgradesPage upgrades={upgrades} />;
}
