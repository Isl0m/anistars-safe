import MarketOfferPage from "@/components/pages/market-offer";

export default async function MarketOffer(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return <MarketOfferPage listingId={params.id} />;
}
