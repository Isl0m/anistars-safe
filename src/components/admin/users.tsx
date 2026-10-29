"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import type { AdminUserRow, UserFilter } from "@/lib/admin/queries";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

import { UserAvatar } from "../user-avatar";
import { ROLE_LABELS } from "./labels";
import { Chip, EmptyState, fmt, Spinner, Tag } from "./ui";

const FILTERS: { value: UserFilter; label: string }[] = [
  { value: "recent", label: "Новые" },
  { value: "active", label: "Активные" },
  { value: "rich", label: "Богатые" },
  { value: "premium", label: "Премиум" },
  { value: "banned", label: "Забанены" },
  { value: "botBlocked", label: "Блок бота" },
  { value: "staff", label: "Команда" },
];

function useDebounced<T>(value: T, ms = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function AdminUsers() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<UserFilter>("recent");
  const query = useDebounced(q);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["admin", "users", query, filter],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<{
        users: AdminUserRow[];
        hasMore: boolean;
      }>("/api/admin/users", {
        params: { q: query, filter, page: pageParam },
      });
      return data;
    },
    getNextPageParam: (last, pages) =>
      last.hasMore ? pages.length + 1 : undefined,
  });

  const users = data?.pages.flatMap((p) => p.users) ?? [];

  return (
    <>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ID, @username или имя"
            className="pl-9"
            inputMode="search"
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((f) => (
            <Chip
              key={f.value}
              active={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {isLoading && <Spinner />}
      {isError && <EmptyState>Не удалось загрузить игроков</EmptyState>}
      {data && users.length === 0 && <EmptyState>Никого не нашлось</EmptyState>}

      {users.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {users.map((u) => (
            <li key={u.id}>
              <Link
                href={`/admin/users/${u.id}`}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50"
              >
                <UserAvatar name={u.name} photoUrl={u.photoUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">
                      {u.name}
                    </span>
                    {u.type !== "basic" && (
                      <Tag tone="info">{ROLE_LABELS[u.type] ?? u.type}</Tag>
                    )}
                    {u.isBlocked && <Tag tone="bad">Бан</Tag>}
                    {u.isBotBlocked && <Tag tone="warn">Блок бота</Tag>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {u.tgUserName ? `@${u.tgUserName} · ` : ""}
                    {u.id}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <p className="tabular-nums text-foreground">
                    {fmt(u.coins)} 🪙
                  </p>
                  <p>{u.lastActivityAt ? timeAgo(u.lastActivityAt) : "—"}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {isFetchingNextPage ? "Загрузка…" : "Показать ещё"}
        </Button>
      )}
    </>
  );
}
