import { getFilterOptions } from "@/components/get-filte-options";
import { Profile } from "@/components/profile";

export default async function ProfilePage() {
  const filterOptions = await getFilterOptions();
  return <Profile filterOptions={filterOptions} />;
}
