"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { User } from "@/db/schema/user";
import { Input } from "@/ui/input";

import { Header } from "../header";
import { useTelegram } from "../telegram-provider";

export default function TradeReceiverPage() {
  const { tgUser } = useTelegram();
  const [user, setUser] = useState<User>();

  useEffect(() => {
    if (tgUser) {
      fetch(`${process.env.NEXT_PUBLIC_URL}/api/user?id=${tgUser.id}`)
        .then((res) => res.json())
        .then((data) => {
          setUser(data.user);
        });
    }
  }, [tgUser]);

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col gap-8 px-4 py-12 md:container">
        <h1 className="text-center text-4xl font-extrabold tracking-tight lg:text-5xl">
          Загрузка...
        </h1>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 md:container">
      <TradePageContent user={user} />
    </main>
  );
}

function TradePageContent({ user }: { user: User }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [receiver, setReceiver] = useState("");

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
    if (receiver === user.id) {
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
    } catch (e) {
      toast({
        title: "Ошибка",
        description: "Пользователь не найден",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header
        title="Трейд"
        element={
          <Link
            href={"/trade/history"}
            className={buttonVariants({
              variant: "outline",
            })}
          >
            История трейдов
          </Link>
        }
      />

      <div className="mb-2 flex items-center space-x-4 px-2">
        <UserIcon className="ml-2 h-4 w-4 text-muted-foreground" />
        <Input
          id="recipient"
          type="text"
          placeholder="Введите ид получателя"
          value={receiver}
          onChange={(e) => setReceiver(e.target.value)}
          className="w-full"
        />
      </div>

      <div className="fixed bottom-0 left-0 flex w-full gap-4 border-t bg-background p-2">
        <Button
          onClick={handleReceiver}
          className="w-full"
          size={"sm"}
          disabled={!receiver || isLoading}
        >
          Продолжить
        </Button>
      </div>
    </>
  );
}
