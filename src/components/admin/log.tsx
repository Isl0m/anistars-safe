"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

import { Button } from "@/ui/button";

import { ACTION_LABELS } from "./labels";
import { EmptyState, fmtDate, Section, Spinner } from "./ui";
import { describeDetails } from "./user-detail";

type LogRow = {
  id: number;
  action: string;
  targetUserId: string | null;
  targetName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export default function AdminLog() {
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["admin", "logs"],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await api.get<{ logs: LogRow[]; hasMore: boolean }>("/api/admin/logs", {
          params: { page: pageParam },
        })
      ).data,
    getNextPageParam: (last, pages) =>
      last.hasMore ? pages.length + 1 : undefined,
  });
  const logs = data?.pages.flatMap((p) => p.logs) ?? [];

  return (
    <Section
      title="Журнал действий"
      description="Всё, что было изменено через панель."
    >
      {isLoading && <Spinner />}
      {isError && <EmptyState>Не удалось загрузить журнал</EmptyState>}
      {data && logs.length === 0 && <EmptyState>Пока пусто</EmptyState>}
      {logs.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {logs.map((log) => (
            <li key={log.id} className="space-y-0.5 px-4 py-2.5 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-medium">
                  {ACTION_LABELS[log.action] ?? log.action}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {fmtDate(log.createdAt)}
                </span>
              </div>
              {log.targetUserId && (
                <Link
                  href={`/admin/users/${log.targetUserId}`}
                  className="block truncate text-xs text-primary hover:underline"
                >
                  {log.targetName ?? log.targetUserId}
                </Link>
              )}
              <p className="break-words text-xs text-muted-foreground">
                {describeDetails(log.details)}
              </p>
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
    </Section>
  );
}
