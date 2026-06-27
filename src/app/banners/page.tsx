import { getBanners } from "@/lib/queries";

import { BannersPage } from "@/components/pages/banners";

export const revalidate = 900;

export default async function CardUpgrades() {
  const banners = await getBanners();
  return <BannersPage banners={banners} />;
}
