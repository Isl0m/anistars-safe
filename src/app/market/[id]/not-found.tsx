"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Header } from "@/components/header";
import { useTelegramBackButton } from "@/hook/use-telegram-back-button";
import { buttonVariants } from "@/ui/button";

export default function MarketListingNotFound() {
  useTelegramBackButton("/market");

  return (
    <main className="flex h-full flex-col">
      <Header title="Не найдено" />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10">
        <div className="rounded-full bg-muted p-4">
          <ShieldAlert className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Лот не найден или был удалён
        </p>
        <Link href="/market" className={buttonVariants()}>
          К маркетплейсу
        </Link>
      </div>
    </main>
  );
}
