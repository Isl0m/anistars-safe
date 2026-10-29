"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Crown, Trophy } from "lucide-react";

import { api } from "@/lib/api";
import type {
  ColosseumField,
  ColosseumTopRow,
  Leaderboards,
  Standing,
  Standings,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

import {
  buildBoards,
  fmt,
  fmtCompact,
  MEDALS,
  plural,
  SPLIT,
  SPLIT_ORDER,
  type Board,
  type BoardRow,
} from "@/components/top/boards";
import { useCurrentUser } from "@/hook/use-current-user";
import { Skeleton } from "@/ui/skeleton";

import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { UserAvatar } from "../user-avatar";

// Hex accent plus alpha, for tints of a board's hue.
const tint = (hex: string, alpha: number) =>
  hex +
  Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");

const battlesOf = (r: ColosseumTopRow) => r.wins + r.draws + r.loses;

// One player's wins, draws and losses as a stacked bar. The ranked field
// goes first so it starts at the same baseline on every row and its length
// compares down the list; the other two are dimmed. Total length is the
// player's battles against the busiest player on the board.
function SplitBar({
  row,
  ranked,
  scale,
  className,
}: {
  row: ColosseumTopRow;
  ranked: ColosseumField;
  scale: number;
  className?: string;
}) {
  const order = [ranked, ...SPLIT_ORDER.filter((f) => f !== ranked)];
  const width = scale > 0 ? (battlesOf(row) / scale) * 100 : 0;

  return (
    <div className={cn("h-1.5 w-full rounded-full bg-white/5", className)}>
      <div className="flex h-full gap-[2px]" style={{ width: `${width}%` }}>
        {order
          .filter((field) => row[field] > 0)
          .map((field) => (
            <div
              key={field}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                flex: `${row[field]} 1 0`,
                backgroundColor: SPLIT[field].color,
                opacity: field === ranked ? 1 : 0.35,
              }}
            />
          ))}
      </div>
    </div>
  );
}

function SplitLegend({ ranked }: { ranked: ColosseumField }) {
  return (
    <div className="flex items-center gap-2.5 text-[11px] font-normal normal-case tracking-normal text-muted-foreground">
      {SPLIT_ORDER.map((field) => (
        <span key={field} className="flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: SPLIT[field].color,
              opacity: field === ranked ? 1 : 0.35,
            }}
          />
          {SPLIT[field].label}
        </span>
      ))}
    </div>
  );
}

// Share of the leader's value, in the board's hue on a track of the same hue.
function Meter({
  value,
  max,
  accent,
}: {
  value: number;
  max: number;
  accent: string;
}) {
  return (
    <div
      className="h-1.5 w-full rounded-full"
      style={{ backgroundColor: tint(accent, 0.15) }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${max > 0 ? Math.min(value / max, 1) * 100 : 0}%`,
          backgroundColor: accent,
        }}
      />
    </div>
  );
}

function BoardTabs({
  boards,
  active,
  onSelect,
}: {
  boards: Board[];
  active: string;
  onSelect: (key: Board["key"]) => void;
}) {
  return (
    <nav className="no-scrollbar flex gap-1.5 overflow-x-auto border-b bg-card px-3 py-2">
      {boards.map(({ key, tab, Icon, accent }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "text-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
            style={
              isActive
                ? { borderColor: accent, backgroundColor: tint(accent, 0.15) }
                : undefined
            }
          >
            <Icon
              className="h-3.5 w-3.5"
              style={isActive ? { color: accent } : undefined}
            />
            {tab}
          </button>
        );
      })}
    </nav>
  );
}

// Step heights for 1st, 2nd and 3rd; 1st stands in the middle.
const STEPS = ["h-[72px]", "h-12", "h-8"];
const SPOT_COLUMN = ["col-start-2", "col-start-1", "col-start-3"];

function PodiumSpot({
  row,
  place,
  board,
  splitScale,
  isMine,
}: {
  row: BoardRow;
  place: number;
  board: Board;
  splitScale: number;
  isMine: boolean;
}) {
  const medal = MEDALS[place - 1];
  const isFirst = place === 1;

  return (
    <Link
      href={`/profile/${row.userId}`}
      className={cn(
        "row-start-1 flex min-w-0 flex-col items-center",
        SPOT_COLUMN[place - 1]
      )}
    >
      {isFirst && (
        <Crown
          className="mb-1 h-5 w-5"
          style={{ color: medal.color }}
          fill="currentColor"
          aria-label={medal.label}
        />
      )}
      <div className="relative">
        <div
          className="rounded-full p-[2px]"
          style={{ backgroundColor: medal.color }}
        >
          <div className="rounded-full bg-card p-[2px]">
            <UserAvatar
              name={row.name}
              photoUrl={row.photoUrl}
              size={isFirst ? 68 : 52}
            />
          </div>
        </div>
        <span
          className="absolute -bottom-2 left-1/2 flex h-5 min-w-5 -translate-x-1/2 items-center justify-center rounded-full px-1 text-[11px] font-bold text-black ring-2 ring-card"
          style={{ backgroundColor: medal.color }}
        >
          {place}
        </span>
      </div>

      <span className="mt-3.5 w-full truncate px-1 text-center text-xs font-semibold">
        {row.name}
      </span>
      {isMine && (
        <span className="text-[10px] font-medium text-muted-foreground">
          это ты
        </span>
      )}
      <span
        className={cn(
          "mt-0.5 font-bold leading-tight",
          isFirst ? "text-xl" : "text-base"
        )}
      >
        {fmt(row.value)}
      </span>
      <span className="text-center text-[10px] leading-tight text-muted-foreground">
        <span className="font-medium text-foreground/90">{row.side}</span>
        <br />
        {row.sideLabel}
      </span>

      {row.split && board.ranked ? (
        <SplitBar
          row={row.split}
          ranked={board.ranked}
          scale={splitScale}
          className="mt-2 w-4/5"
        />
      ) : null}

      <div
        className={cn(
          "mt-3 flex w-full items-start justify-center rounded-t-xl border-x border-t pt-1.5",
          STEPS[place - 1]
        )}
        style={{
          borderColor: tint(medal.color, 0.35),
          backgroundImage: `linear-gradient(to bottom, ${tint(medal.color, 0.22)}, ${tint(medal.color, 0)})`,
        }}
      >
        <span className="text-sm font-black text-foreground/70">{place}</span>
      </div>
    </Link>
  );
}

function Stage({
  board,
  splitScale,
  myId,
}: {
  board: Board;
  splitScale: number;
  myId?: string;
}) {
  const podium = board.rows.slice(0, 3);
  const { Icon, accent } = board;

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card">
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ backgroundColor: accent }}
      />

      <div className="relative flex items-start gap-3 px-4 pt-4">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: tint(accent, 0.18), color: accent }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {board.eyebrow} · топ-10
          </span>
          <h2 className="text-lg font-bold leading-tight">{board.title}</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {board.description}
          </p>
        </div>
      </div>

      {podium.length > 0 ? (
        <div className="relative mt-5 grid grid-cols-3 items-end gap-2 px-3">
          {podium.map((row, i) => (
            <PodiumSpot
              key={row.userId}
              row={row}
              place={i + 1}
              board={board}
              splitScale={splitScale}
              isMine={row.userId === myId}
            />
          ))}
        </div>
      ) : (
        <div className="relative flex flex-col items-center gap-3 px-4 py-12 text-center">
          <div className="rounded-full bg-muted p-4">
            <Trophy className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Рейтинг пока пуст</p>
            <p className="text-xs text-muted-foreground">
              Загляните позже — здесь появятся лучшие игроки
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsGrid({ board }: { board: Board }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
      {board.stats.map((stat) => (
        <div key={stat.label} className="flex flex-col gap-0.5 bg-card p-3">
          <span className="text-base font-bold leading-tight">
            {stat.value}
          </span>
          <span className="text-[11px] leading-snug text-muted-foreground">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function RankRow({
  row,
  place,
  board,
  leaderValue,
  splitScale,
  isMine,
}: {
  row: BoardRow;
  place: number;
  board: Board;
  leaderValue: number;
  splitScale: number;
  isMine: boolean;
}) {
  return (
    <Link
      href={`/profile/${row.userId}`}
      className="relative flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
      style={isMine ? { backgroundColor: tint(board.accent, 0.1) } : undefined}
    >
      {isMine && (
        <span
          className="absolute inset-y-2 left-0 w-0.5 rounded-r-full"
          style={{ backgroundColor: board.accent }}
        />
      )}
      <span className="w-5 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
        {place}
      </span>
      <UserAvatar name={row.name} photoUrl={row.photoUrl} size={34} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium">
            {row.name}
            {isMine && (
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                это ты
              </span>
            )}
          </span>
          <span className="shrink-0 text-sm font-bold tabular-nums">
            {fmt(row.value)}
          </span>
        </div>

        {row.split && board.ranked ? (
          <SplitBar row={row.split} ranked={board.ranked} scale={splitScale} />
        ) : (
          <Meter value={row.value} max={leaderValue} accent={board.accent} />
        )}

        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate">{row.meta}</span>
          <span className="shrink-0 tabular-nums">
            <span className="font-medium text-foreground/90">{row.side}</span>{" "}
            {row.sideLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

function RankList({
  board,
  splitScale,
  myId,
}: {
  board: Board;
  splitScale: number;
  myId?: string;
}) {
  const rest = board.rows.slice(3);
  const leaderValue = board.rows[0]?.value ?? 0;
  if (rest.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Места 4–{board.rows.length}</span>
        {board.ranked && <SplitLegend ranked={board.ranked} />}
      </div>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {rest.map((row, i) => (
          <RankRow
            key={row.userId}
            row={row}
            place={i + 4}
            board={board}
            leaderValue={leaderValue}
            splitScale={splitScale}
            isMine={row.userId === myId}
          />
        ))}
      </div>
    </div>
  );
}

function StandingCard({
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

  if (isLoading) return <Skeleton className="h-[74px] rounded-xl" />;

  const avatar = me ? (
    <UserAvatar name={me.name} photoUrl={me.photoUrl} size={36} />
  ) : null;

  if (!standing) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur">
        {avatar}
        <div className="flex min-w-0 flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Твоё место
          </span>
          <span className="text-sm font-medium">
            Тебя пока нет в этом рейтинге
          </span>
          <span className="text-[11px] text-muted-foreground">
            {board.emptyHint}
          </span>
        </div>
      </div>
    );
  }

  const { value, rank, players } = standing;
  const inTop = rank <= 10;
  const better = Math.floor(((players - rank) / Math.max(players, 1)) * 100);
  const need = Math.max(threshold - value + 1, 1);

  return (
    <div
      className="flex items-center gap-3 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur"
      style={{ borderColor: tint(board.accent, 0.45) }}
    >
      {avatar}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {inTop ? "Ты в топ-10" : "Твоё место"}
        </span>
        <span className="truncate text-sm font-semibold">
          {fmt(value)} {plural(value, board.unit)}
        </span>
        {!inTop && threshold > 0 && (
          <div className="flex items-center gap-2">
            <Meter value={value} max={threshold} accent={board.accent} />
            <span className="shrink-0 text-[11px] text-muted-foreground">
              ещё {fmtCompact(need)} до топ-10
            </span>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="flex items-center gap-1 text-xl font-bold leading-tight">
          {inTop && rank <= 3 && (
            <Crown
              className="h-4 w-4"
              style={{ color: MEDALS[rank - 1].color }}
              fill="currentColor"
            />
          )}
          #{fmt(rank)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {rank === 1 ? "лучший результат" : `лучше ${better}% игроков`}
        </span>
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
  const [active, setActive] = useState<Board["key"]>(boards[0].key);
  const scrollRef = useRef<HTMLElement>(null);
  const telegram = useTelegram();
  const userId = useHydrated() ? telegram.userId : undefined;

  const { data: standings, isLoading } = useQuery({
    queryKey: ["top-standings", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await api.get<{ standings: Standings }>(`/api/top/me`);
      return data.standings;
    },
  });

  const board = boards.find((b) => b.key === active) ?? boards[0];
  const splitScale = Math.max(
    0,
    ...board.rows.map((r) => (r.split ? battlesOf(r.split) : 0))
  );

  const selectBoard = (key: Board["key"]) => {
    setActive(key);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  return (
    <main className="flex h-full flex-col">
      <Header title="Рейтинги" />
      <BoardTabs boards={boards} active={active} onSelect={selectBoard} />

      <section ref={scrollRef} className="relative flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 pb-4 pt-3">
          <Stage board={board} splitScale={splitScale} myId={userId} />
          <StatsGrid board={board} />
          <RankList board={board} splitScale={splitScale} myId={userId} />
          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
            {board.footnote}
          </p>
        </div>

        {userId && (
          <div className="sticky bottom-0 z-10 bg-gradient-to-t from-background via-background/90 to-transparent pb-[calc(var(--safe-area-bottom)+0.75rem)] pt-6">
            <div className="mx-auto w-full max-w-2xl px-3">
              <StandingCard
                board={board}
                standing={standings?.[board.key]}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
