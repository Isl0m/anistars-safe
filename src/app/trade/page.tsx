import TradePage from "@/components/pages/trade";
import TradeReceiverPage from "@/components/pages/trade-receiver";

export default async function Trade(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const receiver = searchParams.receiver;
  if (receiver && !Array.isArray(receiver))
    return <TradePage receiver={receiver} />;
  return <TradeReceiverPage />;
}
