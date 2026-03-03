"use client";

import { useParams } from "next/navigation";

import { UniverseCollection } from "@/components/pages/universe-collection";

export default function UniverseCollectionPage() {
  const params = useParams();
  const universeId = Number(params.id);

  return <UniverseCollection universeId={universeId} />;
}
