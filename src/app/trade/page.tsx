import TradePage from "@/components/pages/trade";
import TradeReceiverPage from "@/components/pages/trade-receiver";

export default async function Trade({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const receiver = searchParams.receiver;
  console.log(receiver);
  if (receiver && !Array.isArray(receiver))
    return <TradePage receiver={receiver} />;
  return <TradeReceiverPage />;
}
