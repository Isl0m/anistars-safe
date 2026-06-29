import { NextResponse } from "next/server";
import { InlineKeyboard } from "grammy";
import { z } from "zod";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import { getApi, getMe, getProfileLink } from "@/lib/bot";
import {
  fulfillTradeWithCards,
  getTrade,
  getUser,
  validateCardsForTrade,
} from "@/lib/queries";

const updateTradeSchema = z.object({
  tradeId: z.number(),
  cardIds: z.string().array(),
  cost: z.number(),
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
  const { tradeId, cardIds, cost } = parsed.data;

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
