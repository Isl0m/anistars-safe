import MarketOfferPage from "@/components/pages/market-offer";

export default function MarketOffer({ params }: { params: { id: string } }) {
  return <MarketOfferPage listingId={params.id} />;
}
