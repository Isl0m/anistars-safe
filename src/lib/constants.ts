export const MAX_LISTING_CARDS = 12;

// Max simultaneously active market entries, by account tier.
// Listings are "active"; offers are "pending".
export const MAX_ACTIVE_LISTINGS = { premium: 3, basic: 1 } as const;
export const MAX_ACTIVE_OFFERS = { premium: 5, basic: 3 } as const;

// Cards one side may put into a single multi-trade, by account tier.
export const MAX_CARDS_PER_TRADE = { premium: 10, basic: 5 } as const;

/**
 * Rate limit on trade creation. Each trade sends the receiver a Telegram
 * notification, so the thing worth stopping is a burst, not a long-standing
 * pile of open trades between two people who genuinely trade a lot.
 *
 * `perReceiver` stops flooding one person; `total` stops spraying many
 * different people, which a per-pair limit alone would allow.
 *
 * Thresholds picked against 51k historical trades — share of trades that would
 * have been refused:
 *   perReceiver 3 -> 6.7%   5 -> 3.1%
 *   total       5 -> 3.9%  10 -> 0.7%
 */
export const TRADE_RATE_WINDOW_MINUTES = 10;
export const MAX_TRADES_PER_WINDOW = { perReceiver: 5, total: 10 } as const;

export const CARDS_PER_PAGE = 16;

export const LISTINGS_PER_PAGE = 10;

export const listingStatusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  active: { label: "Активно", variant: "default" },
  completed: { label: "Завершено", variant: "secondary" },
  cancelled: { label: "Отменено", variant: "destructive" },
};

export const offerStatusMap: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Ожидание",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  },
  accepted: {
    label: "Принято",
    className: "border-green-500/30 bg-green-500/10 text-green-600",
  },
  cancelled: {
    label: "Отменено",
    className: "border-red-500/30 bg-red-500/10 text-red-600",
  },
};

// Rarity names from the DB are prefixed with a colored emoji (e.g. "🟢 Изумрудная").
// Strip the emoji for display and tint the chip with a matching color instead.
const RARITY_EMOJI_RE = /^\p{Extended_Pictographic}[\uFE0F\u20E3]?\s*/u;

export function stripRarityEmoji(name: string): string {
  return name.replace(RARITY_EMOJI_RE, "").trim();
}

export type RarityChipStyle = { base: string; selected: string };

// Keyed by the emoji-stripped Russian label. Tints tuned for the forced-dark theme;
// colors mirror the rarity's emoji ball. Class strings are static so Tailwind keeps them.
const rarityChipStyles: Record<string, RarityChipStyle> = {
  Хроматическая: {
    base: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300",
    selected: "border-fuchsia-400 bg-fuchsia-500/25 text-fuchsia-200 ring-1 ring-fuchsia-400/50",
  },
  Ивентовая: {
    base: "border-red-500/30 bg-red-500/10 text-red-300",
    selected: "border-red-400 bg-red-500/25 text-red-200 ring-1 ring-red-400/50",
  },
  Изумрудная: {
    base: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    selected: "border-emerald-400 bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-400/50",
  },
  Алмазная: {
    base: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    selected: "border-blue-400 bg-blue-500/25 text-blue-200 ring-1 ring-blue-400/50",
  },
  Золотая: {
    base: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    selected: "border-yellow-400 bg-yellow-500/25 text-yellow-200 ring-1 ring-yellow-400/50",
  },
  Серебряная: {
    base: "border-slate-400/30 bg-slate-400/10 text-slate-300",
    selected: "border-slate-300 bg-slate-400/25 text-slate-100 ring-1 ring-slate-300/50",
  },
  Бронзовая: {
    base: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    selected: "border-orange-400 bg-orange-500/25 text-orange-200 ring-1 ring-orange-400/50",
  },
};

const defaultRarityChipStyle: RarityChipStyle = {
  base: "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
  selected: "border-primary bg-primary/10 text-primary",
};

export function getRarityChipStyle(name: string): RarityChipStyle {
  return rarityChipStyles[stripRarityEmoji(name)] ?? defaultRarityChipStyle;
}
