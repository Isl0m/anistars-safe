import { getTradeFull } from "@/lib/queries";

import TradeShowPage from "@/components/pages/trade-show";

export default async function Trade({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const tradeId = searchParams.tradeId && Number(searchParams.tradeId);
  if (!tradeId)
    return (
      <div>
        <h1>Нет такого трейда</h1>
      </div>
    );
  const trade = await getTradeFull(tradeId);
  if (!trade) {
    return (
      <div>
        <h1>Нет такого трейда</h1>
      </div>
    );
  }

  if (!trade.senderCards.length || !trade.receiverCards.length) {
    return (
      <div>
        <h1>Ошибка с тейдом</h1>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <TradeShowPage trade={trade} />
    </main>
  );
}
