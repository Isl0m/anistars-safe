import MarketViewPage from "@/components/pages/market-view";

export default function MarketView({ params }: { params: { id: string } }) {
  return <MarketViewPage id={params.id} />;
}
