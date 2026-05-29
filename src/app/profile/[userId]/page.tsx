import { PublicProfileInfo } from "@/components/pages/profile-info";

export default function PublicProfilePage({
  params,
}: {
  params: { userId: string };
}) {
  return <PublicProfileInfo userId={params.userId} />;
}
