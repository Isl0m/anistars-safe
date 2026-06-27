"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Clock, Loader2, Repeat2, UserIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { User } from "@/db/schema/user";
import { Input } from "@/ui/input";

import { Header } from "../header";
import { useTelegram } from "../telegram-provider";

export default function TradeReceiverPage() {
  const { tgUser } = useTelegram();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [receiver, setReceiver] = useState("");

  const query = useQuery({
    queryKey: ["user", tgUser?.id],
    queryFn: async () => {
      if (!tgUser) return null;
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user?id=${tgUser.id}`
      );
      return (await response.json()).user as Promise<User>;
    },
    placeholderData: keepPreviousData,
  });

  const handleReceiver = async () => {
    setIsLoading(true);
    if (!receiver) {
      toast({
        title: "Ошибка",
        description: "Введите ид получателя",
        variant: "destructive",
      });
      setReceiver("");
      setIsLoading(false);
      return;
    }
    if (receiver === query.data?.id) {
      toast({
        title: "Ошибка",
        description: "Нельзя трейдится с самим собой",
        variant: "destructive",
      });
      setReceiver("");
      setIsLoading(false);
      return;
    }
    try {
      const data = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/user/check?id=${receiver}`
      ).then((res) => res.json());
      if (data.isCanTrade) {
        router.push(`/trade?receiver=${receiver}`);
      } else {
        if (!receiver) {
          toast({
            title: "Ошибка",
            description: "Пользователь не может трейдится",
            variant: "destructive",
          });
        }
      }
      setIsLoading(false);
    } catch {
      toast({
        title: "Ошибка",
        description: "Пользователь не найден",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Header
        title="Трейд"
        element={
          <Link
            href="/trade/history"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            История
          </Link>
        }
      />

      <div className="flex flex-1 flex-col items-center px-4 pt-16">
        <div className="mb-6 rounded-full bg-primary/10 p-4">
          <Repeat2 className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mb-2 text-lg font-bold">Отправить трейд</h2>
        <p className="mb-8 max-w-[280px] text-center text-sm text-muted-foreground">
          Введите ID получателя, чтобы предложить обмен картами
        </p>

        <div className="w-full max-w-sm">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="recipient"
              type="text"
              placeholder="ID получателя"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              className="border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleReceiver();
              }}
            />
          </div>
        </div>
      </div>

      <div className="border-t bg-card p-4">
        <Button
          onClick={handleReceiver}
          className="w-full"
          disabled={!receiver || isLoading || query.isLoading || !query.data}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Продолжить
        </Button>
      </div>
    </main>
  );
}
