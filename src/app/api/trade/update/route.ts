import { NextResponse } from "next/server";
import { InlineKeyboard } from "grammy";
import { z } from "zod";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import { getApi, getMe, getProfileLink } from "@/lib/bot";
import {
  fulfillTradeWithCards,
  getCardRarityIds,
  getTrade,
  getTradeSenderCardIds,
  getTradeSenderRarityIds,
  getUser,
  validateCardsForTrade,
} from "@/lib/queries";
import { calcTradeCost } from "@/lib/trade-cost";

const updateTradeSchema = z.object({
  tradeId: z.number().int().positive(),
  cardIds: z.string().array(),
});
export type UpdateTradeType = z.infer<typeof updateTradeSchema>;

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const parsed = updateTradeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse("Data schema not correct", 400);
  }
  const { tradeId, cardIds } = parsed.data;

  const trade = await getTrade(tradeId);
  if (!trade) {
    return errorResponse("Trade not found", 404);
  }
  if (trade.receiverId !== userId) {
    return errorResponse("Forbidden", 403);
  }
  if (trade.status !== "pending") {
    return errorResponse("Trade is not pending", 400);
  }

  const validation = await validateCardsForTrade(cardIds, userId);
  if (!validation.ok) {
    return errorResponse(validation.error, validation.status);
  }

  // Settlement treats a card present on both sides as a mutual duplicate and
  // converts both copies instead of transferring them — never allow overlap.
  const senderCardIds = new Set(await getTradeSenderCardIds(tradeId));
  if (validation.cardIds.some((id) => senderCardIds.has(id))) {
    return errorResponse(
      "Нельзя предлагать карту, которая уже участвует в этом трейде",
      400
    );
  }

  // The cost is never taken from the request: it is what the receiver pays and
  // the receiver is the one calling here, so a client-supplied value is worth
  // nothing. Recompute it from the two card sets instead.
  const senderRarityIds = await getTradeSenderRarityIds(tradeId);
  if (validation.cardIds.length !== senderRarityIds.length) {
    return errorResponse(
      `You must offer exactly ${senderRarityIds.length} cards`,
      400
    );
  }
  const rarityByCardId = await getCardRarityIds(validation.cardIds);
  const receiverRarityIds = validation.cardIds.map((id) =>
    rarityByCardId.get(id)
  );
  if (receiverRarityIds.some((rarityId) => rarityId === undefined)) {
    return errorResponse("Some cards no longer exist", 400);
  }
  const cost = calcTradeCost(senderRarityIds, receiverRarityIds as number[]);

  let updated;
  try {
    updated = await fulfillTradeWithCards(tradeId, cost, validation.cardIds);
  } catch (e) {
    console.error("trade update failed:", e);
    return errorResponse("Something went wrong", 500);
  }

  try {
    const [receiver, me] = await Promise.all([
      getUser(updated.receiverId),
      getMe(),
    ]);
    const reply_markup = new InlineKeyboard()
      .webApp(
        "Посмотреть",
        `${process.env.HOST_URL}/trade/show?tradeId=${updated.id}`
      )
      .row()
      .text("Подтвердить", `acceptMultiTrade,${updated.id}`);
    await getApi().sendMessage(
      updated.senderId,
      `${getProfileLink(me.username, receiver.id, receiver.name)} предлагает вам трейд`,
      { parse_mode: "HTML", reply_markup }
    );
  } catch (e) {
    console.error("trade update notification failed:", e);
  }

  return NextResponse.json(updated);
}
