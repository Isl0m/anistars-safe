import { getTradeWithSenderCards } from "@/lib/queries";

import TradeAcceptPage from "@/components/pages/trade-accept";

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
  const trade = await getTradeWithSenderCards(tradeId);
  if (!trade) {
    return (
      <div>
        <h1>Нет такого трейда</h1>
      </div>
    );
  }

  if (!trade.senderCards.length) {
    return (
      <div>
        <h1>Ошибка с тейдом</h1>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 ">
      <TradeAcceptPage trade={trade} />
    </main>
  );
}
