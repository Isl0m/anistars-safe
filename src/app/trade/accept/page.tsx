import { getTradeWithSenderCards } from "@/lib/queries";

import TradeAcceptPage from "@/components/pages/trade-accept";

export default async function Trade(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
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
  const statusMapper = {
    fulfilled: "заполнен",
    cancelled: "отменен",
    completed: "завершен",
  };
  if (trade.status !== "pending") {
    return (
      <div>
        <h1>Трейд {statusMapper[trade.status]}</h1>
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
    <main className="flex h-full flex-col md:container">
      <TradeAcceptPage trade={trade} />
    </main>
  );
}
