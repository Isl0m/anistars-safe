"use client";

import Image from "next/image";
import { ArrowRightLeft, Coins, UserIcon } from "lucide-react";

import { getImageProxyUrl } from "@/lib/utils";

import { Card } from "@/db/schema/card";
import { SelectMultiTrade } from "@/db/schema/trade";
import { Badge } from "@/ui/badge";

import { Header } from "../header";
import { UserLink } from "../user-link";

export default function TradeShowPage({
  trade,
}: {
  trade: SelectMultiTrade & {
    senderName: string;
    senderPhotoUrl: string | null;
    receiverName: string;
    receiverPhotoUrl: string | null;
    senderCards: Card[];
    receiverCards: Card[];
  };
}) {
  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <Header title="Детали трейда" />
      <div className="space-y-4 px-3">
        <div className="rounded-xl border bg-card p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Отправлено ({trade.senderCards.length})
            </h4>
            {trade.cost > 0 && (
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600"
              >
                <Coins className="mr-1 h-3 w-3" />
                {trade.cost}
              </Badge>
            )}
          </div>
          <UserLink
            userId={trade.senderId}
            name={trade.senderName}
            photoUrl={trade.senderPhotoUrl}
            size={24}
            className="mb-2"
          >
            <span className="text-xs text-muted-foreground">
              {trade.senderName}
            </span>
          </UserLink>
          <SuggestedCardsList cards={trade.senderCards} />
        </div>

        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-2">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3.5">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-green-600">
            <UserIcon className="h-3.5 w-3.5" />
            Получено ({trade.receiverCards.length})
          </h4>
          <UserLink
            userId={trade.receiverId}
            name={trade.receiverName}
            photoUrl={trade.receiverPhotoUrl}
            size={24}
            avatarClassName="bg-secondary text-secondary-foreground"
            className="mb-2"
          >
            <span className="text-xs text-muted-foreground">
              {trade.receiverName}
            </span>
          </UserLink>
          <SuggestedCardsList cards={trade.receiverCards} />
        </div>
      </div>
    </main>
  );
}

function SuggestedCardsList({ cards }: { cards: Card[] }) {
  return (
    <ul className="grid grid-cols-5 gap-2">
      {cards.map((card) => (
        <li
          key={card.id}
          className="overflow-hidden rounded-md border shadow-sm"
        >
          <Image
            src={getImageProxyUrl(card.image)}
            width={240}
            height={320}
            className="rounded-md"
            alt={card.slug}
          />
        </li>
      ))}
    </ul>
  );
}
