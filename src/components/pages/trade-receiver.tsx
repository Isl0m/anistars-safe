"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  Clock,
  Loader2,
  Repeat2,
  Search,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";

import { Button, buttonVariants } from "@/components/ui/button";
import { UserExtended } from "@/db/schema/user";
import { Input } from "@/ui/input";

import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { UserAvatar } from "../user-avatar";

export default function TradeReceiverPage() {
  const { userId } = useTelegram();
  const router = useRouter();
  const [receiver, setReceiver] = useState("");
  const [searchedId, setSearchedId] = useState<string | null>(null);

  const lookupQuery = useQuery({
    queryKey: ["trade-receiver-lookup", searchedId],
    enabled: !!searchedId,
    retry: false,
    queryFn: async () => {
      const { data } = await api.get<{
        user: UserExtended;
        isCanTrade: boolean;
      }>(`/api/user/check`, {
        params: { id: searchedId },
      });
      if (!data.user) throw new Error("not found");
      return data;
    },
  });

  const handleSearch = () => {
    const id = receiver.trim();
    if (!id) {
      toast.warning("Введите ид получателя");
      return;
    }
    if (id === userId) {
      toast.warning("Нельзя трейдится с самим собой");
      return;
    }
    setSearchedId(id);
  };

  const handleContinue = () => {
    if (searchedId && lookupQuery.data?.isCanTrade) {
      router.push(`/trade?receiver=${searchedId}`);
    }
  };

  const profile = lookupQuery.data;

  return (
    <main>
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

      <div className="flex flex-col items-center px-4 pt-12">
        <div className="mb-6 rounded-full bg-primary/10 p-4">
          <Repeat2 className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mb-2 text-lg font-bold">Отправить трейд</h2>
        <p className="mb-8 max-w-[280px] text-center text-sm text-muted-foreground">
          Введите ID получателя и проверьте, что это нужный игрок
        </p>

        <div className="w-full max-w-sm space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="recipient"
              type="text"
              placeholder="ID получателя"
              value={receiver}
              onChange={(e) => {
                setReceiver(e.target.value);
                setSearchedId(null);
              }}
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSearch}
            disabled={!receiver.trim() || lookupQuery.isFetching}
          >
            {lookupQuery.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Найти
          </Button>

          {searchedId && !lookupQuery.isFetching && (
            <>
              {lookupQuery.isError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-center text-sm text-destructive">
                  Пользователь не найден
                </div>
              ) : profile?.isCanTrade ? (
                <button
                  type="button"
                  onClick={handleContinue}
                  className="flex w-full items-center gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/30 hover:bg-card/80 active:scale-[0.99]"
                >
                  <UserAvatar
                    name={profile.user.name}
                    photoUrl={profile.user.photoUrl}
                    size={48}
                    className="ring-2 ring-card"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold">
                      {profile.user.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      ID: {profile.user.id}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-primary">
                      Нажмите, чтобы продолжить обмен
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                </button>
              ) : profile ? (
                <div className="rounded-xl border bg-card p-3.5">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={profile.user.name}
                      photoUrl={profile.user.photoUrl}
                      size={48}
                      className="ring-2 ring-card"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold">
                        {profile.user.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        ID: {profile.user.id}
                      </p>
                    </div>
                    <ShieldAlert className="h-5 w-5 flex-shrink-0 text-destructive" />
                  </div>
                  <p className="mt-2.5 rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
                    Этот пользователь не может участвовать в обмене
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
