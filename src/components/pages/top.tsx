"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";

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
  plural,
  SPLIT,
  SPLIT_ORDER,
  type Board,
  type BoardRow,
} from "@/components/top/boards";
import {
  CrownMark,
  initialsBackground,
  MedalRing,
  METALS,
  StepNumeral,
  tint,
} from "@/components/top/medal";
import { useCurrentUser } from "@/hook/use-current-user";
import { Skeleton } from "@/ui/skeleton";

import { Header } from "../header";
import { useTelegram } from "../telegram-provider";
import { UserAvatar } from "../user-avatar";

const battlesOf = (r: ColosseumTopRow) => r.wins + r.draws + r.loses;

function PlayerAvatar({
  name,
  photoUrl,
  size,
}: {
  name: string;
  photoUrl: string | null;
  size: number;
}) {
  return (
    <UserAvatar
      name={name}
      photoUrl={photoUrl}
      size={size}
      style={
        photoUrl
          ? undefined
          : { background: initialsBackground(name), color: "#fff" }
      }
    />
  );
}

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
      {boards.map(({ key, tab, accent }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              isActive
                ? "text-foreground"
                : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
            )}
            style={
              isActive
                ? {
                    borderColor: tint(accent, 0.7),
                    backgroundImage: `linear-gradient(180deg, ${tint(accent, 0.32)}, ${tint(accent, 0.14)})`,
                    boxShadow: `0 4px 14px ${tint(accent, 0.25)}, inset 0 1px 0 rgba(255,255,255,0.12)`,
                  }
                : undefined
            }
          >
            {tab}
          </button>
        );
      })}
    </nav>
  );
}

// Per place (1st, 2nd, 3rd): step height, numeral size, avatar size and
// glow. First stands in the middle and tallest.
const PODIUM = [
  {
    column: "col-start-2",
    step: 96,
    numeral: "text-4xl",
    avatar: 76,
    glow: 32,
  },
  {
    column: "col-start-1",
    step: 70,
    numeral: "text-3xl",
    avatar: 56,
    glow: 22,
  },
  {
    column: "col-start-3",
    step: 54,
    numeral: "text-2xl",
    avatar: 56,
    glow: 22,
  },
];

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
  const metal = METALS[place - 1];
  const spot = PODIUM[place - 1];
  const isFirst = place === 1;

  return (
    <Link
      href={`/profile/${row.userId}`}
      aria-label={`${place} место: ${row.name}`}
      className={cn(
        "row-start-1 flex min-w-0 flex-col items-center",
        spot.column
      )}
    >
      {isFirst && <CrownMark className="-mb-2 w-12" />}
      <MedalRing metal={metal} glow={spot.glow}>
        <PlayerAvatar
          name={row.name}
          photoUrl={row.photoUrl}
          size={spot.avatar}
        />
      </MedalRing>

      <span className="mt-2.5 w-full truncate px-1 text-center text-xs font-semibold">
        {row.name}
      </span>
      {isMine && (
        <span className="text-[10px] font-medium text-muted-foreground">
          это ты
        </span>
      )}
      <span
        className={cn(
          "font-extrabold leading-tight tracking-tight",
          isFirst ? "text-2xl" : "text-lg"
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
        className="mt-3 w-full rounded-t-2xl pt-2.5 text-center"
        style={{
          height: spot.step,
          backgroundImage: `linear-gradient(180deg, ${tint(metal.base, 0.26)} 0%, ${tint(metal.base, 0.08)} 60%, ${tint(metal.base, 0)} 100%)`,
          boxShadow: `inset 0 1px 0 ${tint(metal.light, 0.6)}, inset 1px 0 0 ${tint(metal.base, 0.16)}, inset -1px 0 0 ${tint(metal.base, 0.16)}`,
        }}
      >
        <StepNumeral metal={metal} place={place} className={spot.numeral} />
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
  const { accent } = board;

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card">
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ backgroundColor: accent }}
      />

      <div className="relative flex flex-col gap-1 px-4 pt-4">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: accent,
              boxShadow: `0 0 8px ${accent}`,
            }}
          />
          {board.eyebrow} · топ-10
        </span>
        <h2 className="text-balance text-xl font-extrabold leading-tight tracking-tight">
          {board.title}
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {board.description}
        </p>
      </div>

      {podium.length > 0 ? (
        <div className="relative mt-6 grid grid-cols-3 items-end gap-2 px-3">
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
      <PlayerAvatar name={row.name} photoUrl={row.photoUrl} size={34} />

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
    <PlayerAvatar name={me.name} photoUrl={me.photoUrl ?? null} size={36} />
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
          {rank === 1 && <CrownMark className="w-6" />}#{fmt(rank)}
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

        {/* Without the viewer's standing there is nothing true to say about
            their place, so a failed request hides the bar rather than
            reading as «not on this board». */}
        {userId && !isError && (
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
