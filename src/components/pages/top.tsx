"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";

import type {
  ColosseumField,
  ColosseumTop,
  Leaderboards,
  SpendingTop,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

import { Header } from "../header";
import { UserAvatar } from "../user-avatar";

const ruNumber = new Intl.NumberFormat("ru-RU");
const ruDecimal = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const fmt = (value: number) => ruNumber.format(value);
const pct = (part: number, whole: number) =>
  whole > 0 ? `${ruDecimal.format((part / whole) * 100)}%` : "—";

// 1 карта, 2 карты, 5 карт
function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

// The bot rolls its daily stats over in Asia/Bangkok, so dates read there too.
function bangkokParts(date: string) {
  const d = new Date(new Date(date).getTime() + 7 * 3_600_000);
  return {
    day: d.getUTCDate(),
    month: d.getUTCMonth(),
    year: d.getUTCFullYear(),
  };
}

// «1 апреля 2026»
function formatDay(date: string) {
  const { day, month, year } = bangkokParts(date);
  return `${day} ${MONTHS_GENITIVE[month]} ${year}`;
}

// «мая 2024», as in «с мая 2024 года»
function formatMonth(date: string) {
  const { month, year } = bangkokParts(date);
  return `${MONTHS_GENITIVE[month]} ${year}`;
}

// Counted against the snapshot time, not the viewer's clock, so the server
// and client render the same number.
function daysBetween(from: string, to: string) {
  const dayIndex = (date: string) => {
    const { day, month, year } = bangkokParts(date);
    return Date.UTC(year, month, day) / 86_400_000;
  };
  return dayIndex(to) - dayIndex(from) + 1;
}

type Stat = { value: ReactNode; label: string };

type Row = {
  userId: string;
  name: string;
  photoUrl: string | null;
  value: number;
  detail: ReactNode;
  side: ReactNode;
  sideLabel: string;
};

type Board = {
  key: string;
  emoji: string;
  tab: string;
  eyebrow: string;
  title: string;
  description: ReactNode;
  column: string;
  sideColumn: string;
  // Static class strings so Tailwind keeps them.
  bar: string;
  glow: string;
  chip: string;
  stats: Stat[];
  rows: Row[];
  footnote: ReactNode;
};

function Wdl({ wins, draws, loses }: ColosseumTop["rows"][number]) {
  return (
    <span className="tabular-nums">
      <span className="text-emerald-400">{fmt(wins)}</span>
      <span className="text-muted-foreground"> / </span>
      <span className="text-foreground/80">{fmt(draws)}</span>
      <span className="text-muted-foreground"> / </span>
      <span className="text-rose-400">{fmt(loses)}</span>
    </span>
  );
}

const colosseumMeta: Record<
  ColosseumField,
  {
    emoji: string;
    tab: string;
    title: string;
    description: string;
    column: string;
    share: string;
    bar: string;
    glow: string;
    chip: string;
  }
> = {
  wins: {
    emoji: "⚔️",
    tab: "Победы",
    title: "Топ-10 по победам в колизее",
    description:
      "Рейтинг по количеству побед в колизее за всё время. Рядом — победы, ничьи и поражения и процент побед от всех боёв игрока.",
    column: "Побед",
    share: "побед",
    bar: "from-rose-500 to-amber-400",
    glow: "from-rose-600/25",
    chip: "border-rose-400/50 bg-rose-500/15 text-rose-200",
  },
  loses: {
    emoji: "💀",
    tab: "Поражения",
    title: "Топ-10 по поражениям",
    description:
      "Рейтинг по количеству поражений в колизее за всё время. Много поражений — значит много боёв: эти игроки не боятся выходить на арену.",
    column: "Поражений",
    share: "поражений",
    bar: "from-violet-500 to-rose-500",
    glow: "from-violet-600/25",
    chip: "border-violet-400/50 bg-violet-500/15 text-violet-200",
  },
  draws: {
    emoji: "⚖️",
    tab: "Ничьи",
    title: "Топ-10 по ничьим",
    description:
      "Рейтинг по количеству ничьих в колизее за всё время. Ничья — когда ни один игрок не смог взять верх.",
    column: "Ничьих",
    share: "ничьих",
    bar: "from-sky-400 to-emerald-400",
    glow: "from-sky-600/25",
    chip: "border-sky-400/50 bg-sky-500/15 text-sky-200",
  },
};

function colosseumBoard(
  field: ColosseumField,
  data: ColosseumTop,
  updatedAt: string
): Board {
  const meta = colosseumMeta[field];
  const battles = (r: ColosseumTop["rows"][number]) =>
    r.wins + r.draws + r.loses;
  const shares = data.rows.map((r) => r[field] / Math.max(battles(r), 1));
  const bestShare = shares.length ? Math.max(...shares) : 0;
  const [first, second] = data.rows;
  const threshold = data.rows.at(-1)?.[field] ?? 0;

  const stats: Record<ColosseumField, Stat[]> = {
    wins: [
      { value: fmt(data.total), label: "побед за всё время" },
      {
        value: fmt(data.players),
        label: `${plural(data.players, ["игрок", "игрока", "игроков"])} сражались`,
      },
      { value: fmt(threshold), label: "побед нужно для топ-10" },
      { value: pct(bestShare, 1), label: "лучший винрейт в топе" },
    ],
    loses: [
      { value: fmt(data.total), label: "поражений за всё время" },
      { value: fmt(threshold), label: "поражений нужно для топ-10" },
      {
        value: pct(bestShare, 1),
        label: "самая высокая доля поражений в топе",
      },
      {
        value: fmt(first ? battles(first) : 0),
        label: "боёв у лидера",
      },
    ],
    draws: [
      { value: fmt(data.total), label: "ничьих за всё время" },
      { value: fmt(threshold), label: "ничьих нужно для топ-10" },
      { value: pct(bestShare, 1), label: "самая высокая доля ничьих в топе" },
      {
        value: fmt(first && second ? first.draws - second.draws : 0),
        label: "ничьих разрыв между 1 и 2 местом",
      },
    ],
  };

  return {
    key: field,
    emoji: meta.emoji,
    tab: meta.tab,
    eyebrow: "Колизей",
    title: meta.title,
    description: meta.description,
    column: meta.column,
    sideColumn: field === "wins" ? "Винрейт" : "Доля",
    bar: meta.bar,
    glow: meta.glow,
    chip: meta.chip,
    stats: stats[field],
    rows: data.rows.map((r) => ({
      ...r,
      value: r[field],
      detail: <Wdl {...r} />,
      side: pct(r[field], battles(r)),
      sideLabel: meta.share,
    })),
    footnote: `П / Н / П — победы, ничьи, поражения. ${
      field === "wins"
        ? "Винрейт — доля побед от всех боёв в колизее."
        : `Доля — процент ${meta.share} от всех боёв игрока в колизее.`
    } Данные на ${formatDay(updatedAt)}.`,
  };
}

function spendingBoard(
  kind: "tries" | "coins",
  data: SpendingTop,
  updatedAt: string
): Board {
  const since = data.since ? formatDay(data.since) : null;
  const days = data.since ? daysBetween(data.since, updatedAt) : 0;
  const threshold = data.rows.at(-1)?.spent ?? 0;
  const sinceStat: Stat = {
    value: since ?? "—",
    label: `начало подсчёта (${fmt(days)} дн.)`,
  };
  const sinceNote = since
    ? `с ${since} года — с этого дня бот ведёт ежедневную статистику; более ранние ${
        kind === "tries" ? "крутки" : "траты"
      } не учтены`
    : "";

  if (kind === "tries") {
    return {
      key: "tries",
      emoji: "🎴",
      tab: "Крутки",
      eyebrow: "Крутки карт",
      title: "Топ-10 по круткам",
      description: `Рейтинг по количеству потраченных попыток на получение карт — в меню, мульти-крутках и через /pull в чатах.${
        since ? ` Считается с ${since} года.` : ""
      }`,
      column: "Попыток",
      sideColumn: "В день",
      bar: "from-amber-400 to-yellow-300",
      glow: "from-amber-600/25",
      chip: "border-amber-400/50 bg-amber-500/15 text-amber-200",
      stats: [
        { value: fmt(data.total), label: "попыток потрачено всеми" },
        {
          value: fmt(data.players),
          label: `${plural(data.players, ["игрок", "игрока", "игроков"])} крутили карты`,
        },
        sinceStat,
        { value: fmt(threshold), label: "попыток нужно для топ-10" },
      ],
      rows: data.rows.map((r) => ({
        ...r,
        value: r.spent,
        detail: `${fmt(r.activeDays)} ${plural(r.activeDays, ["день", "дня", "дней"])} с круткой`,
        side: ruDecimal.format(r.spent / Math.max(r.activeDays, 1)),
        sideLabel: "в среднем",
      })),
      footnote: `Попытки считаются ${sinceNote}. «В день» — среднее за дни, когда игрок крутил. Данные на ${formatDay(updatedAt)}.`,
    };
  }

  return {
    key: "coins",
    emoji: "🪙",
    tab: "Монеты",
    eyebrow: "Экономика",
    title: "Топ-10 по потраченным монетам",
    description: `Рейтинг по количеству монет, потраченных в боте: магазины, улучшения карт, фоны и другие покупки.${
      since ? ` Считается с ${since} года.` : ""
    }`,
    column: "Потрачено 🪙",
    sideColumn: "Рекорд",
    bar: "from-yellow-400 to-green-400",
    glow: "from-yellow-600/25",
    chip: "border-yellow-400/50 bg-yellow-500/15 text-yellow-200",
    stats: [
      { value: `${fmt(data.total)} 🪙`, label: "потрачено всеми игроками" },
      {
        value: fmt(data.players),
        label: `${plural(data.players, ["игрок", "игрока", "игроков"])} тратили монеты`,
      },
      sinceStat,
      { value: fmt(threshold), label: "монет нужно для топ-10" },
    ],
    rows: data.rows.map((r) => ({
      ...r,
      value: r.spent,
      detail: `${fmt(r.activeDays)} ${plural(r.activeDays, ["день", "дня", "дней"])} с тратами`,
      side: fmt(r.bestDay),
      sideLabel: "🪙 за один день",
    })),
    footnote: `Монеты считаются ${sinceNote}. Это та же цифра «Потрачено монет», что игрок видит в /stats. «Рекорд» — больше всего монет за один день. Данные на ${formatDay(updatedAt)}.`,
  };
}

function buildBoards(data: Leaderboards): Board[] {
  const { collection, traders, updatedAt } = data;
  const collectionThreshold = collection.rows.at(-1)?.cards ?? 0;
  const tradesSince = traders.since ? formatMonth(traders.since) : null;

  return [
    {
      key: "collection",
      emoji: "🃏",
      tab: "Коллекция",
      eyebrow: "Коллекция",
      title: "Топ-10 коллекционеров",
      description:
        "Рейтинг по количеству разных карт в коллекции прямо сейчас. Каждая карта считается один раз — повторки не учитываются.",
      column: "Разных карт",
      sideColumn: "Коллекция",
      bar: "from-blue-500 to-fuchsia-500",
      glow: "from-indigo-600/25",
      chip: "border-indigo-400/50 bg-indigo-500/15 text-indigo-200",
      stats: [
        {
          value: fmt(collection.totalCards),
          label: `${plural(collection.totalCards, ["карта", "карты", "карт"])} всего в игре`,
        },
        {
          value: fmt(collection.players),
          label: `${plural(collection.players, ["игрок", "игрока", "игроков"])} с картами`,
        },
        {
          value: fmt(collection.medianCards),
          label: `${plural(collection.medianCards, ["карта", "карты", "карт"])} у типичного игрока`,
        },
        {
          value: fmt(collectionThreshold),
          label: `${plural(collectionThreshold, ["карта нужна", "карты нужно", "карт нужно"])} для топ-10`,
        },
      ],
      rows: collection.rows.map((r) => ({
        ...r,
        value: r.cards,
        detail: (
          <span className="flex items-center gap-1.5 tabular-nums">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {fmt(r.emeralds)} изумр.
            <span className="text-muted-foreground/60">·</span>
            <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
            {fmt(r.chromatics)} хромат.
          </span>
        ),
        side: pct(r.cards, collection.totalCards),
        sideLabel: "всех карт",
      })),
      footnote: `Считаются карты, которые сейчас есть у игрока (обменянные или проданные — не учитываются). «Коллекция» — процент от всех ${fmt(collection.totalCards)} карт в игре, включая ивентовые и улучшенные. Данные на ${formatDay(updatedAt)}.`,
    },
    colosseumBoard("wins", data.wins, updatedAt),
    colosseumBoard("loses", data.loses, updatedAt),
    colosseumBoard("draws", data.draws, updatedAt),
    spendingBoard("tries", data.tries, updatedAt),
    spendingBoard("coins", data.coins, updatedAt),
    {
      key: "traders",
      emoji: "🤝",
      tab: "Трейдеры",
      eyebrow: "Статистика обменов",
      title: "Топ-10 трейдеров",
      description: (
        <>
          Рейтинг по числу{" "}
          <b className="font-semibold text-foreground">уникальных партнёров</b>{" "}
          — со сколькими разными игроками ты совершил хотя бы один обмен. Сто
          обменов с одним другом — это 1 партнёр, а не 100.
        </>
      ),
      column: "Партнёров",
      sideColumn: "За 30 дней",
      bar: "from-indigo-500 to-sky-400",
      glow: "from-indigo-600/25",
      chip: "border-sky-400/50 bg-sky-500/15 text-sky-200",
      stats: [
        {
          value: fmt(traders.trades),
          label: `${plural(traders.trades, ["завершённый обмен", "завершённых обмена", "завершённых обменов"])}`,
        },
        {
          value: fmt(traders.players),
          label: `${plural(traders.players, ["игрок", "игрока", "игроков"])} обменивались`,
        },
        {
          value: fmt(traders.pairs),
          label: `${plural(traders.pairs, ["уникальная пара", "уникальные пары", "уникальных пар"])} игроков`,
        },
        {
          value: fmt(traders.medianPartners),
          label: `${plural(traders.medianPartners, ["партнёр", "партнёра", "партнёров"])} у типичного игрока`,
        },
      ],
      rows: traders.rows.map((r) => ({
        ...r,
        value: r.partners,
        detail: `${fmt(r.trades)} ${plural(r.trades, ["обмен", "обмена", "обменов"])} всего`,
        side: fmt(r.recentPartners),
        sideLabel: plural(r.recentPartners, [
          "партнёр",
          "партнёра",
          "партнёров",
        ]),
      })),
      footnote: `Учитываются завершённые обмены картами, мульти-обмены и обмены фонами${
        tradesSince ? ` с ${tradesSince} года` : ""
      }. «За 30 дней» — сколько разных партнёров было за последний месяц. Данные на ${formatDay(updatedAt)}.`,
    },
  ];
}

const medals = [
  {
    emoji: "🥇",
    row: "border-amber-400/40 bg-gradient-to-r from-amber-500/15 to-card",
  },
  {
    emoji: "🥈",
    row: "border-slate-300/30 bg-gradient-to-r from-slate-400/15 to-card",
  },
  {
    emoji: "🥉",
    row: "border-orange-600/40 bg-gradient-to-r from-orange-700/15 to-card",
  },
];

function LeaderRow({
  row,
  place,
  leaderValue,
  bar,
}: {
  row: Row;
  place: number;
  leaderValue: number;
  bar: string;
}) {
  const medal = medals[place - 1];
  const width = leaderValue > 0 ? (row.value / leaderValue) * 100 : 0;

  return (
    <Link
      href={`/profile/${row.userId}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/30",
        medal?.row
      )}
    >
      <div className="flex w-7 shrink-0 justify-center">
        {medal ? (
          <span className="text-2xl leading-none">{medal.emoji}</span>
        ) : (
          <span className="text-lg font-bold tabular-nums text-muted-foreground">
            {place}
          </span>
        )}
      </div>

      <UserAvatar name={row.name} photoUrl={row.photoUrl} size={36} />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold">{row.name}</span>
          <span className="shrink-0 text-base font-bold tabular-nums">
            {fmt(row.value)}
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r", bar)}
            style={{ width: `${width}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="min-w-0 truncate">{row.detail}</span>
          <span className="shrink-0 tabular-nums">
            <span className="font-semibold text-foreground">{row.side}</span>{" "}
            {row.sideLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function TopPage({ leaderboards }: { leaderboards: Leaderboards }) {
  const boards = buildBoards(leaderboards);
  const [active, setActive] = useState(boards[0].key);
  const scrollRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const board = boards.find((b) => b.key === active) ?? boards[0];
  const leaderValue = board.rows[0]?.value ?? 0;

  useEffect(() => {
    tabRefs.current[active]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [active]);

  const selectBoard = (key: string) => {
    setActive(key);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  return (
    <main className="flex h-full flex-col">
      <Header title="Рейтинги" />

      <nav className="no-scrollbar flex gap-2 overflow-x-auto border-b bg-card px-3 py-2">
        {boards.map((b) => (
          <button
            key={b.key}
            ref={(el) => {
              tabRefs.current[b.key] = el;
            }}
            onClick={() => selectBoard(b.key)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              b.key === active
                ? b.chip
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{b.emoji}</span>
            {b.tab}
          </button>
        ))}
      </nav>

      <section
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 pb-[calc(var(--safe-area-bottom)+1.5rem)]"
      >
        <div className="flex flex-col gap-4 md:container">
          <div className="relative overflow-hidden rounded-xl border bg-card p-4">
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent",
                board.glow
              )}
            />
            <div className="relative flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                AniStars · {board.eyebrow}
              </span>
              <h2 className="flex items-center gap-2 text-xl font-bold leading-tight">
                <span>{board.emoji}</span>
                {board.title}
              </h2>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {board.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {board.stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col gap-0.5 rounded-xl border bg-card p-3"
              >
                <span className="text-lg font-bold tabular-nums leading-tight">
                  {stat.value}
                </span>
                <span className="text-[11px] leading-snug text-muted-foreground">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Игрок</span>
              <span>
                {board.column} · {board.sideColumn}
              </span>
            </div>

            {board.rows.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="rounded-full bg-muted p-4">
                  <Trophy className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">Рейтинг пока пуст</p>
                  <p className="text-xs text-muted-foreground">
                    Загляните позже — здесь появятся лучшие игроки
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {board.rows.map((row, i) => (
                  <LeaderRow
                    key={row.userId}
                    row={row}
                    place={i + 1}
                    leaderValue={leaderValue}
                    bar={board.bar}
                  />
                ))}
              </div>
            )}
          </div>

          <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
            {board.footnote}
          </p>
        </div>
      </section>
    </main>
  );
}
