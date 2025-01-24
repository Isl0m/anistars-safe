"use client";

import Image from "next/image";

import { FullCard } from "@/db/schema/card";
import { SelectMultiTrade } from "@/db/schema/trade";
import { Badge } from "@/ui/badge";

import { Header } from "../header";

export default function TradeShowPage({
  trade,
}: {
  trade: SelectMultiTrade & {
    senderName: string;
    receiverName: string;
    senderCards: FullCard[];
    receiverCards: FullCard[];
  };
}) {
  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <Header title="Трейд" />
      <div className="flex items-center justify-between">
        <h3 className="text-lg">Вы отдаете</h3>
        <Badge>Стоимость: {trade.cost}🪙</Badge>
      </div>
      <SuggestedCardsList cards={trade.senderCards} />
      <h3 className="text-lg">Вы получите</h3>
      <SuggestedCardsList cards={trade.receiverCards} />
    </main>
  );
}
type SuggestedCardsListProps = {
  cards: FullCard[];
};

export function SuggestedCardsList({ cards }: SuggestedCardsListProps) {
  return (
    <ul className="grid grid-cols-5 gap-1">
      {cards.map((card) => (
        <li key={card.id}>
          <Image
            src={card.image}
            width={255}
            height={320}
            className="rounded"
            alt={card.slug}
          />
        </li>
      ))}
    </ul>
  );
}
