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
// Past a million the exact figure stops helping and won't fit a card.
export const fmtCompact = (value: number) =>
  value >= 1_000_000 ? ruCompact.format(value) : ruNumber.format(value);
const pct = (part: number, whole: number) =>
  whole > 0 ? `${ruDecimal.format((part / whole) * 100)}%` : "—";

// Signed gaps use a real minus sign so they line up with the digits.
export const fmtGap = (value: number) =>
  value > 0
    ? `+${fmtCompact(value)}`
    : value < 0
      ? `−${fmtCompact(-value)}`
      : "0";

// 1 карта, 2 карты, 5 карт
export function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export type BoardRow = {
  userId: string;
  name: string;
  photoUrl: string | null;
  value: number;
  // What the value means beside the ranking: share of all cards, winrate,
  // pulls per day… Short enough to sit on a #2/#3 card.
  note: string;
};

export type Board = {
  key: BoardKey;
  tab: string;
  // Names the leader's number on the hero card.
  metric: string;
  unit: [string, string, string];
  // Only the collection has a ceiling: the cards that exist. There the bars
  // measure against it; elsewhere they measure against the leader.
  total?: number;
  rows: BoardRow[];
  // What gets a player onto the board, for one who isn't on it yet.
  emptyHint: string;
};

const colosseumMeta: Record<
  ColosseumField,
  {
    tab: string;
    unit: [string, string, string];
    note: (row: ColosseumTopRow, battles: number) => string;
  }
> = {
  wins: {
    tab: "Победы",
    unit: ["победа", "победы", "побед"],
    note: (r, battles) => `винрейт ${pct(r.wins, battles)}`,
  },
  loses: {
    tab: "Поражения",
    unit: ["поражение", "поражения", "поражений"],
    note: (r, battles) => `${pct(r.loses, battles)} всех боёв`,
  },
  draws: {
    tab: "Ничьи",
    unit: ["ничья", "ничьи", "ничьих"],
    note: (r, battles) => `${pct(r.draws, battles)} всех боёв`,
  },
};

function colosseumBoard(field: ColosseumField, data: ColosseumTop): Board {
  const meta = colosseumMeta[field];
  return {
    key: field,
    tab: meta.tab,
    metric: meta.tab,
    unit: meta.unit,
    emptyHint: "Сразись в колизее",
    rows: data.rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      photoUrl: r.photoUrl,
      value: r[field],
      note: meta.note(r, r.wins + r.draws + r.loses),
    })),
  };
}

function spendingBoard(kind: "tries" | "coins", data: SpendingTop): Board {
  if (kind === "tries") {
    return {
      key: "tries",
      tab: "Крутки",
      metric: "Попытки",
      unit: ["попытка", "попытки", "попыток"],
      emptyHint: "Покрути карты",
      rows: data.rows.map((r) => ({
        userId: r.userId,
        name: r.name,
        photoUrl: r.photoUrl,
        value: r.spent,
        note: `${ruDecimal.format(r.spent / Math.max(r.activeDays, 1))} в день`,
      })),
    };
  }

  return {
    key: "coins",
    tab: "Монеты",
    metric: "Потрачено монет",
    unit: ["монета", "монеты", "монет"],
    emptyHint: "Потрать монеты в боте",
    rows: data.rows.map((r) => ({
      userId: r.userId,
      name: r.name,
      photoUrl: r.photoUrl,
      value: r.spent,
      note: `рекорд ${fmtCompact(r.bestDay)}`,
    })),
  };
}

export function buildBoards(data: Leaderboards): Board[] {
  const { collection, traders } = data;

  return [
    {
      key: "collection",
      tab: "Коллекция",
      metric: "Уникальные карты",
      unit: ["карта", "карты", "карт"],
      total: collection.totalCards,
      emptyHint: "Получи первую карту",
      rows: collection.rows.map((r) => ({
        userId: r.userId,
        name: r.name,
        photoUrl: r.photoUrl,
        value: r.cards,
        note: `${pct(r.cards, collection.totalCards)} всех карт`,
      })),
    },
    colosseumBoard("wins", data.wins),
    colosseumBoard("loses", data.loses),
    colosseumBoard("draws", data.draws),
    spendingBoard("tries", data.tries),
    spendingBoard("coins", data.coins),
    {
      key: "traders",
      tab: "Трейдеры",
      metric: "Партнёры по обменам",
      unit: ["партнёр", "партнёра", "партнёров"],
      emptyHint: "Соверши первый обмен",
      rows: traders.rows.map((r) => ({
        userId: r.userId,
        name: r.name,
        photoUrl: r.photoUrl,
        value: r.partners,
        note: `${fmt(r.recentPartners)} за 30 дней`,
      })),
    },
  ];
}
