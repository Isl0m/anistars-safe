/**
 * Coins the receiver pays to even out a multi-trade.
 *
 * Both sides bring the same number of cards, so the imbalance is measured per
 * rarity: every sender card whose rarity the receiver did not match costs
 * `RARITY_MISMATCH_PRICE`. A receiver who brings *more* of a rarity than the
 * sender gets no refund for it, so the result is never negative.
 *
 * This lives in one place because the browser previews the number and
 * `/api/trade/update` is what actually persists and charges it — the two must
 * not drift.
 */
export const RARITY_MISMATCH_PRICE = 100;

export function calcTradeCost(
  senderRarityIds: number[],
  receiverRarityIds: number[]
): number {
  const unmatched = new Map<number, number>();
  for (const rarityId of senderRarityIds) {
    unmatched.set(rarityId, (unmatched.get(rarityId) ?? 0) + 1);
  }
  for (const rarityId of receiverRarityIds) {
    const left = unmatched.get(rarityId);
    if (left) unmatched.set(rarityId, left - 1);
  }

  let total = 0;
  for (const left of unmatched.values()) total += left;
  return total * RARITY_MISMATCH_PRICE;
}
