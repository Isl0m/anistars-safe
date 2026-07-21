import { PublicProfileInfo } from "@/components/pages/profile-info";

export default async function PublicProfilePage(
  props: {
    params: Promise<{ userId: string }>;
  }
) {
  const params = await props.params;
  return <PublicProfileInfo userId={params.userId} />;
}
