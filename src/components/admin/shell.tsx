"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Megaphone,
  ScrollText,
  Settings,
  Ticket,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { useIsOwner } from "@/hook/use-is-owner";
import { Button } from "@/ui/button";

import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { Spinner } from "./ui";

const TABS = [
  { href: "/admin", label: "Обзор", Icon: BarChart3 },
  { href: "/admin/users", label: "Игроки", Icon: Users },
  { href: "/admin/broadcast", label: "Рассылка", Icon: Megaphone },
  { href: "/admin/promo", label: "Промокоды", Icon: Ticket },
  { href: "/admin/settings", label: "Настройки", Icon: Settings },
  { href: "/admin/log", label: "Журнал", Icon: ScrollText },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

function OwnerOnly() {
  const router = useRouter();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <h2 className="text-lg font-semibold">Нет доступа</h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        Панель управления доступна только владельцу бота.
      </p>
      <Button className="mt-2" onClick={() => router.replace("/")}>
        На главную
      </Button>
    </div>
  );
}

const noopSubscribe = () => () => {};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isTelegram } = useTelegram();
  const { data: isOwner, isPending, isError } = useIsOwner();
  // The server has no Telegram login, so it always renders the spinner and the
  // client decides after hydration.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  if (!mounted || (isTelegram && isPending)) {
    return <Spinner className="h-full items-center" />;
  }
  if (!isTelegram || isError || !isOwner) return <OwnerOnly />;

  return (
    <div className="flex h-full flex-col">
      <Header title="Админ-панель" />
      <nav className="border-b bg-card">
        <div className="mx-auto flex gap-1 overflow-x-auto px-2 py-2 md:container">
          {TABS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive(pathname, href)
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-8 p-4 pb-16">
          {children}
        </div>
      </div>
    </div>
  );
}
