"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type {
  BoardKey,
  Leaderboards,
  Standing,
  Standings,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

import { getGradient } from "@/components/collection-progress";
import {
  buildBoards,
  fmt,
  fmtGap,
  plural,
  type Board,
  type BoardRow,
} from "@/components/top/boards";
import { useCurrentUser } from "@/hook/use-current-user";
import { Skeleton } from "@/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/ui/tabs";

import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { UserAvatar } from "../user-avatar";

// A player without a Telegram photo gets the same name-keyed gradient the
// collection cards use, so they always wear the same colours.
function PlayerAvatar({
  name,
  photoUrl,
  size,
  className,
}: {
  name: string;
  photoUrl: string | null;
  size: number;
  className?: string;
}) {
  return (
    <UserAvatar
      name={name}
      photoUrl={photoUrl}
      size={size}
      className={cn(
        !photoUrl && `bg-gradient-to-br text-white ${getGradient(name)}`,
        className
      )}
    />
  );
}

function ProgressBar({
  ratio,
  fill,
  className,
}: {
  ratio: number;
  fill: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-full bg-white/5", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out",
          fill
        )}
        style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }}
      />
    </div>
  );
}

// Bars on the collection board measure against every card in the game; on
// the others there is no ceiling, so they measure against the leader.
const barRatio = (board: Board, value: number) =>
  board.total
    ? value / board.total
    : value / Math.max(board.rows[0]?.value ?? 0, 1);

function LeaderCard({ board, row }: { board: Board; row: BoardRow }) {
  const second = board.rows[1];

  return (
    <Link
      href={`/profile/${row.userId}`}
      className="relative block overflow-hidden rounded-2xl border border-white/10 p-5 transition-colors hover:border-white/20"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-amber-600 opacity-10" />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-1.5 -top-[34px] select-none text-[168px] font-extrabold leading-none tracking-[-0.06em] text-yellow-400/[0.14]"
      >
        1
      </span>

      <div className="relative flex flex-col gap-4">
        <div className="flex items-center gap-3.5">
          <div className="shrink-0 rounded-full bg-gradient-to-br from-yellow-300 to-amber-600 p-0.5">
            <PlayerAvatar
              name={row.name}
              photoUrl={row.photoUrl}
              size={56}
              className="border-[3px] border-[#0b0f1a]"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-yellow-400">
              1 место
            </span>
            <span className="truncate text-xl font-bold tracking-[-0.01em]">
              {row.name}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-end justify-between gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {board.metric}
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="text-[28px] font-bold leading-none tracking-[-0.02em]">
                {fmt(row.value)}
              </span>
              {board.total ? (
                <span className="text-[15px] font-semibold text-muted-foreground/60">
                  {" "}
                  / {fmt(board.total)}
                </span>
              ) : null}
            </span>
          </div>
          {board.total ? (
            <ProgressBar
              ratio={barRatio(board, row.value)}
              fill="from-yellow-500 to-amber-600"
              className="h-2"
            />
          ) : null}
          <div className="flex justify-between gap-3 text-xs text-muted-foreground">
            <span className="truncate">{row.note}</span>
            {second && (
              <span className="shrink-0 tabular-nums">
                отрыв {fmtGap(row.value - second.value)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

const RUNNER_STYLES = {
  2: {
    overlay: "from-slate-400 to-slate-600",
    numeral: "text-slate-300/[0.12]",
    ring: "ring-slate-300",
    fill: "from-slate-300 to-slate-500",
  },
  3: {
    overlay: "from-orange-500 to-amber-600",
    numeral: "text-orange-400/[0.14]",
    ring: "ring-orange-400",
    fill: "from-orange-500 to-amber-600",
  },
};

function RunnerCard({
  board,
  row,
  place,
}: {
  board: Board;
  row: BoardRow;
  place: 2 | 3;
}) {
  const style = RUNNER_STYLES[place];
  const leader = board.rows[0];

  return (
    <Link
      href={`/profile/${row.userId}`}
      className="relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl border border-white/10 p-3.5 transition-colors hover:border-white/20"
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-10",
          style.overlay
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-1 -top-[22px] select-none text-[96px] font-extrabold leading-none tracking-[-0.06em]",
          style.numeral
        )}
      >
        {place}
      </span>

      <PlayerAvatar
        name={row.name}
        photoUrl={row.photoUrl}
        size={36}
        className={cn("ring-2", style.ring)}
      />
      <div className="relative flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold">{row.name}</span>
        <span className="text-xl font-bold tabular-nums">{fmt(row.value)}</span>
      </div>
      <ProgressBar
        ratio={barRatio(board, row.value)}
        fill={style.fill}
        className="relative h-1.5"
      />
      <span className="relative truncate text-[11px] tabular-nums text-muted-foreground">
        {row.note} · {fmtGap(row.value - leader.value)}
      </span>
    </Link>
  );
}

function RankRow({
  row,
  place,
  leaderValue,
  isMine,
}: {
  row: BoardRow;
  place: number;
  leaderValue: number;
  isMine: boolean;
}) {
  return (
    <Link
      href={`/profile/${row.userId}`}
      className={cn(
        "flex items-center gap-3 border-b py-2.5 transition-colors hover:bg-secondary/30",
        isMine && "-mx-2 rounded-md bg-secondary/50 px-2"
      )}
    >
      <span className="w-5 shrink-0 text-[13px] font-semibold tabular-nums text-muted-foreground">
        {place}
      </span>
      <PlayerAvatar name={row.name} photoUrl={row.photoUrl} size={32} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {row.name}
      </span>
      <div className="flex shrink-0 flex-col items-end">
        <span className="text-sm font-semibold tabular-nums">
          {fmt(row.value)}
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {fmtGap(row.value - leaderValue)}
        </span>
      </div>
    </Link>
  );
}

// The viewer's own place, pinned under the scroll area so it never covers
// the list.
function StandingBar({
  board,
  standing,
  isLoading,
}: {
  board: Board;
  standing: Standing | null | undefined;
  isLoading: boolean;
}) {
  const { data: me } = useCurrentUser();
  const threshold =
    board.rows.length >= 10 ? (board.rows.at(-1)?.value ?? 0) : 0;
  const isUnranked = !isLoading && !standing;

  let detail: React.ReactNode = board.emptyHint;
  let side: React.ReactNode = null;

  if (isLoading) {
    detail = <Skeleton className="mt-0.5 h-4 w-40" />;
    side = <Skeleton className="h-6 w-12" />;
  } else if (standing) {
    const { value, rank, players } = standing;
    const better = Math.floor(((players - rank) / Math.max(players, 1)) * 100);
    detail = `${fmt(value)} ${plural(value, board.unit)} · ${
      rank === 1 ? "лучший результат" : `лучше ${better}%`
    }`;
    side = (
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-xl font-bold tabular-nums leading-tight">
          #{fmt(rank)}
        </span>
        {rank > 10 && threshold > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {fmtGap(-(threshold - value + 1))} до топ-10
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="border-t bg-background">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 pb-[calc(20px+var(--safe-area-bottom))] pt-3">
        {me ? (
          <PlayerAvatar
            name={me.name}
            photoUrl={me.photoUrl ?? null}
            size={40}
          />
        ) : (
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[11px] text-muted-foreground">
            {isUnranked ? "Тебя пока нет в рейтинге" : "Твоё место"}
          </span>
          <span className="truncate text-sm font-semibold">{detail}</span>
        </div>
        {side}
      </div>
    </div>
  );
}

const noopSubscribe = () => () => {};

// The Telegram user only exists in the browser; the prerendered page has no
// viewer. Reading it before hydration finishes would make the first client
// render differ from the server's.
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

export function TopPage({ leaderboards }: { leaderboards: Leaderboards }) {
  const boards = buildBoards(leaderboards);
  const [active, setActive] = useState<BoardKey>(boards[0].key);
  const scrollRef = useRef<HTMLElement>(null);
  const telegram = useTelegram();
  const userId = useHydrated() ? telegram.userId : undefined;

  const {
    data: standings,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["top-standings", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<{ standings: Standings }>(`/api/top/me`);
      return data.standings;
    },
  });

  const board = boards.find((b) => b.key === active) ?? boards[0];
  const [leader, second, third] = board.rows;
  const rest = board.rows.slice(3);

  const selectBoard = (key: string) => {
    setActive(key as BoardKey);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  return (
    <main className="flex h-full flex-col">
      <Header title="Рейтинги" />

      <section ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pb-5 pt-3">
          <Tabs value={board.key} onValueChange={selectBoard}>
            <TabsList className="no-scrollbar mb-1 flex h-auto w-full justify-start gap-0.5 overflow-x-auto rounded-md bg-muted p-1">
              {boards.map((b) => (
                <TabsTrigger
                  key={b.key}
                  value={b.key}
                  className="h-8 flex-[1_0_auto] px-2.5 text-sm font-medium data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                >
                  {b.tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {leader ? (
            <LeaderCard board={board} row={leader} />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Рейтинг пока пуст — загляните позже
            </p>
          )}

          {second && (
            <div className="grid grid-cols-2 gap-3">
              <RunnerCard board={board} row={second} place={2} />
              {third && <RunnerCard board={board} row={third} place={3} />}
            </div>
          )}

          {rest.length > 0 && (
            <>
              <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Места 4–{board.rows.length}
              </span>
              <div className="flex flex-col">
                {rest.map((row, i) => (
                  <RankRow
                    key={row.userId}
                    row={row}
                    place={i + 4}
                    leaderValue={leader.value}
                    isMine={row.userId === userId}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Without the viewer's standing there is nothing true to say about
          their place, so a failed request hides the bar rather than reading
          as «not on this board». */}
      {userId && !isError && (
        <StandingBar
          board={board}
          standing={standings?.[board.key]}
          isLoading={isLoading}
        />
      )}
    </main>
  );
}
