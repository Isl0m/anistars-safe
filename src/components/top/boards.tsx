import type { ReactNode } from "react";
import {
  Coins,
  Handshake,
  Library,
  Scale,
  Skull,
  Sparkles,
  Swords,
  type LucideIcon,
} from "lucide-react";

import type {
  BoardKey,
  ColosseumField,
  ColosseumTop,
  ColosseumTopRow,
  Leaderboards,
  SpendingTop,
} from "@/lib/queries";

const ruNumber = new Intl.NumberFormat("ru-RU");
const ruDecimal = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const ruCompact = new Intl.NumberFormat("ru-RU", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export const fmt = (value: number) => ruNumber.format(value);
// Tiles hold a few characters; past a million the exact figure stops helping.
export const fmtCompact = (value: number) =>
  value >= 1_000_000 ? ruCompact.format(value) : ruNumber.format(value);
export const pct = (part: number, whole: number) =>
  whole > 0 ? `${ruDecimal.format((part / whole) * 100)}%` : "—";

// 1 карта, 2 карты, 5 карт
export function plural(n: number, forms: [string, string, string]) {
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
export function formatDay(date: string) {
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

// Wins, draws and losses as one stacked bar. A fixed categorical order,
// validated against the card surface: every adjacent pair stays apart under
// colour-blindness simulation and clears 3:1 contrast.
export const SPLIT: Record<ColosseumField, { label: string; color: string }> = {
  wins: { label: "Победы", color: "#199e70" },
  draws: { label: "Ничьи", color: "#3987e5" },
  loses: { label: "Поражения", color: "#d95926" },
};

export const SPLIT_ORDER: ColosseumField[] = ["wins", "draws", "loses"];

export const MEDALS = [
  { label: "Золото", color: "#f5c451" },
  { label: "Серебро", color: "#cbd5e1" },
  { label: "Бронза", color: "#e0915a" },
];

export type Stat = { value: string; label: string };

export type BoardRow = {
  userId: string;
  name: string;
  photoUrl: string | null;
  value: number;
  meta: ReactNode;
  side: string;
  sideLabel: string;
  split?: ColosseumTopRow;
};

export type Board = {
  key: BoardKey;
  Icon: LucideIcon;
  tab: string;
  eyebrow: string;
  title: string;
  description: string;
  // One hue per board, used for its marks only — text stays in text tokens.
  accent: string;
  unit: [string, string, string];
  stats: Stat[];
  rows: BoardRow[];
  // Set on the colosseum boards: the field they rank, drawn first in the split.
  ranked?: ColosseumField;
  // What to do to get onto the board, for a player who isn't on it yet.
  emptyHint: string;
  footnote: string;
};

const players = (n: number) => plural(n, ["игрок", "игрока", "игроков"]);

function SplitMeta({ row }: { row: ColosseumTopRow }) {
  return (
    <span className="flex items-center gap-2 tabular-nums">
      {SPLIT_ORDER.map((field) => (
        <span key={field} className="flex items-center gap-1">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: SPLIT[field].color }}
          />
          {fmt(row[field])}
        </span>
      ))}
    </span>
  );
}

const colosseumMeta: Record<
  ColosseumField,
  {
    Icon: LucideIcon;
    title: string;
    description: string;
    unit: [string, string, string];
    share: string;
  }
> = {
  wins: {
    Icon: Swords,
    title: "Победы в колизее",
    description: "Больше всего побед на арене за всё время.",
    unit: ["победа", "победы", "побед"],
    share: "побед",
  },
  loses: {
    Icon: Skull,
    title: "Поражения в колизее",
    description:
      "Много поражений — значит много боёв: эти игроки не боятся выходить на арену.",
    unit: ["поражение", "поражения", "поражений"],
    share: "поражений",
  },
  draws: {
    Icon: Scale,
    title: "Ничьи в колизее",
    description: "Бои, в которых ни один игрок не смог взять верх.",
    unit: ["ничья", "ничьи", "ничьих"],
    share: "ничьих",
  },
};

function colosseumBoard(
  field: ColosseumField,
  data: ColosseumTop,
  updatedAt: string
): Board {
  const meta = colosseumMeta[field];
  const battles = (r: ColosseumTopRow) => r.wins + r.draws + r.loses;
  const shares = data.rows.map((r) => r[field] / Math.max(battles(r), 1));
  const bestShare = shares.length ? Math.max(...shares) : 0;
  const [first, second] = data.rows;
  const threshold = data.rows.at(-1)?.[field] ?? 0;

  const stats: Record<ColosseumField, Stat[]> = {
    wins: [
      { value: fmtCompact(data.total), label: "побед за всё время" },
      {
        value: fmtCompact(data.players),
        label: `${players(data.players)} сражались`,
      },
      { value: fmt(threshold), label: "побед нужно для топ-10" },
      { value: pct(bestShare, 1), label: "лучший винрейт в топе" },
    ],
    loses: [
      { value: fmtCompact(data.total), label: "поражений за всё время" },
      { value: fmt(threshold), label: "поражений нужно для топ-10" },
      { value: pct(bestShare, 1), label: "самая высокая доля в топе" },
      { value: fmt(first ? battles(first) : 0), label: "боёв у лидера" },
    ],
    draws: [
      { value: fmtCompact(data.total), label: "ничьих за всё время" },
      { value: fmt(threshold), label: "ничьих нужно для топ-10" },
      { value: pct(bestShare, 1), label: "самая высокая доля в топе" },
      {
        value: fmt(first && second ? first.draws - second.draws : 0),
        label: "разрыв между 1 и 2 местом",
      },
    ],
  };

  return {
    key: field,
    Icon: meta.Icon,
    tab: SPLIT[field].label,
    eyebrow: "Колизей",
    title: meta.title,
    description: meta.description,
    accent: SPLIT[field].color,
    unit: meta.unit,
    stats: stats[field],
    ranked: field,
    emptyHint: "Сразись в колизее — и место появится здесь",
    rows: data.rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      photoUrl: r.photoUrl,
      value: r[field],
      meta: <SplitMeta row={r} />,
      side: pct(r[field], battles(r)),
      sideLabel: field === "wins" ? "винрейт" : meta.share,
      split: r,
    })),
    footnote: `Полоса — все бои игрока: победы, ничьи и поражения, ${
      field === "wins" ? "победы" : meta.share
    } первыми. ${
      field === "wins" ? "Винрейт — доля побед" : `Доля — процент ${meta.share}`
    } от всех боёв в колизее. Данные на ${formatDay(updatedAt)}.`,
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
    value: since ? since.replace(/ \d{4}$/, "") : "—",
    label: `начало подсчёта, ${fmt(days)} дн.`,
  };
  const sinceNote = since
    ? `с ${since} года — с этого дня бот ведёт ежедневную статистику, более ранние ${
        kind === "tries" ? "крутки" : "траты"
      } не учтены`
    : "";
  const daysLabel = (n: number) => plural(n, ["день", "дня", "дней"]);

  if (kind === "tries") {
    return {
      key: "tries",
      Icon: Sparkles,
      tab: "Крутки",
      eyebrow: "Крутки карт",
      title: "Больше всех крутят",
      description:
        "Попытки на получение карт — в меню, мульти-крутках и через /pull в чатах.",
      accent: "#d55181",
      unit: ["попытка", "попытки", "попыток"],
      emptyHint: "Покрути карты — и место появится здесь",
      stats: [
        { value: fmtCompact(data.total), label: "попыток потрачено всеми" },
        {
          value: fmtCompact(data.players),
          label: `${players(data.players)} крутили карты`,
        },
        sinceStat,
        { value: fmt(threshold), label: "попыток нужно для топ-10" },
      ],
      rows: data.rows.map((r) => ({
        userId: r.userId,
        name: r.name,
        photoUrl: r.photoUrl,
        value: r.spent,
        meta: `${fmt(r.activeDays)} ${daysLabel(r.activeDays)} с круткой`,
        side: ruDecimal.format(r.spent / Math.max(r.activeDays, 1)),
        sideLabel: "в день",
      })),
      footnote: `Попытки считаются ${sinceNote}. «В день» — среднее за дни, когда игрок крутил. Данные на ${formatDay(updatedAt)}.`,
    };
  }

  return {
    key: "coins",
    Icon: Coins,
    tab: "Монеты",
    eyebrow: "Экономика",
    title: "Больше всех тратят",
    description:
      "Монеты, потраченные в боте: магазины, улучшения карт, фоны и другие покупки.",
    accent: "#c98500",
    unit: ["монета", "монеты", "монет"],
    emptyHint: "Потрать монеты в боте — и место появится здесь",
    stats: [
      { value: fmtCompact(data.total), label: "монет потрачено всеми" },
      {
        value: fmtCompact(data.players),
        label: `${players(data.players)} тратили монеты`,
      },
      sinceStat,
      { value: fmtCompact(threshold), label: "монет нужно для топ-10" },
    ],
    rows: data.rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      photoUrl: r.photoUrl,
      value: r.spent,
      meta: `${fmt(r.activeDays)} ${daysLabel(r.activeDays)} с тратами`,
      side: fmtCompact(r.bestDay),
      sideLabel: "рекорд за день",
    })),
    footnote: `Монеты считаются ${sinceNote}. Это та же цифра «Потрачено монет», что игрок видит в /stats. «Рекорд» — больше всего монет за один день. Данные на ${formatDay(updatedAt)}.`,
  };
}

export function buildBoards(data: Leaderboards): Board[] {
  const { collection, traders, updatedAt } = data;
  const collectionThreshold = collection.rows.at(-1)?.cards ?? 0;
  const tradesSince = traders.since ? formatMonth(traders.since) : null;

  return [
    {
      key: "collection",
      Icon: Library,
      tab: "Коллекция",
      eyebrow: "Коллекция",
      title: "Лучшие коллекционеры",
      description:
        "Разные карты в коллекции прямо сейчас. Повторки не считаются.",
      accent: "#9085e9",
      unit: ["разная карта", "разные карты", "разных карт"],
      emptyHint: "Получи первую карту — и место появится здесь",
      stats: [
        {
          value: fmt(collection.totalCards),
          label: `${plural(collection.totalCards, ["карта", "карты", "карт"])} в игре`,
        },
        {
          value: fmtCompact(collection.players),
          label: `${players(collection.players)} с картами`,
        },
        {
          value: fmt(collection.medianCards),
          label: `${plural(collection.medianCards, ["карта", "карты", "карт"])} у типичного игрока`,
        },
        {
          value: fmt(collectionThreshold),
          label: "нужно для топ-10",
        },
      ],
      rows: collection.rows.map((r) => ({
        userId: r.userId,
        name: r.name,
        photoUrl: r.photoUrl,
        value: r.cards,
        meta: (
          <span className="flex items-center gap-2 tabular-nums">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {fmt(r.emeralds)} изумр.
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
              {fmt(r.chromatics)} хромат.
            </span>
          </span>
        ),
        side: pct(r.cards, collection.totalCards),
        sideLabel: "всех карт",
      })),
      footnote: `Считаются карты, которые сейчас есть у игрока: обменянные и проданные — нет. Процент — от всех ${fmt(collection.totalCards)} карт в игре, включая ивентовые и улучшенные. Данные на ${formatDay(updatedAt)}.`,
    },
    colosseumBoard("wins", data.wins, updatedAt),
    colosseumBoard("loses", data.loses, updatedAt),
    colosseumBoard("draws", data.draws, updatedAt),
    spendingBoard("tries", data.tries, updatedAt),
    spendingBoard("coins", data.coins, updatedAt),
    {
      key: "traders",
      Icon: Handshake,
      tab: "Трейдеры",
      eyebrow: "Обмены",
      title: "Самые общительные",
      description:
        "Со сколькими разными игроками был хотя бы один обмен. Сто обменов с одним другом — это один партнёр.",
      accent: "#3987e5",
      unit: ["партнёр", "партнёра", "партнёров"],
      emptyHint: "Соверши первый обмен — и место появится здесь",
      stats: [
        {
          value: fmtCompact(traders.trades),
          label: `${plural(traders.trades, ["обмен", "обмена", "обменов"])} завершено`,
        },
        {
          value: fmtCompact(traders.players),
          label: `${players(traders.players)} обменивались`,
        },
        {
          value: fmtCompact(traders.pairs),
          label: `${plural(traders.pairs, ["пара", "пары", "пар"])} игроков`,
        },
        {
          value: fmt(traders.medianPartners),
          label: `${plural(traders.medianPartners, ["партнёр", "партнёра", "партнёров"])} у типичного игрока`,
        },
      ],
      rows: traders.rows.map((r) => ({
        userId: r.userId,
        name: r.name,
        photoUrl: r.photoUrl,
        value: r.partners,
        meta: `${fmt(r.trades)} ${plural(r.trades, ["обмен", "обмена", "обменов"])}`,
        side: fmt(r.recentPartners),
        sideLabel: "за 30 дней",
      })),
      footnote: `Учитываются завершённые обмены картами, мульти-обмены и обмены фонами${
        tradesSince ? ` с ${tradesSince} года` : ""
      }. «За 30 дней» — сколько разных партнёров было за последний месяц. Данные на ${formatDay(updatedAt)}.`,
    },
  ];
}
