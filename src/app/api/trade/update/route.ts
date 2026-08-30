import { NextResponse } from "next/server";
import { InlineKeyboard } from "grammy";
import { z } from "zod";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import { getApi, getMe, getProfileLink } from "@/lib/bot";
import {
  fulfillTradeWithCards,
  getTrade,
  getTradeSenderCardIds,
  getUser,
  validateCardsForTrade,
} from "@/lib/queries";

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
  const senderCardIds = await getTradeSenderCardIds(tradeId);
  const senderCardIdSet = new Set(senderCardIds);
  if (validation.cardIds.some((id) => senderCardIdSet.has(id))) {
    return errorResponse(
      "Нельзя предлагать карту, которая уже участвует в этом трейде",
      400
    );
  }

  if (validation.cardIds.length !== senderCardIds.length) {
    return errorResponse(
      `You must offer exactly ${senderCardIds.length} cards`,
      400
    );
  }

  let updated;
  try {
    updated = await fulfillTradeWithCards(tradeId, validation.cardIds);
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
