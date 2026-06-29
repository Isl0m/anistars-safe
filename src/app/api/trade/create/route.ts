import { NextResponse } from "next/server";
import { InlineKeyboard } from "grammy";
import { z } from "zod";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import { getApi, getMe, getProfileLink } from "@/lib/bot";
import {
  createTradeWithCards,
  getUser,
  validateCardsForTrade,
} from "@/lib/queries";

const createTradeSchema = z.object({
  receiverId: z.string(),
  cardIds: z.string().array(),
});
export type CreateTradeType = z.infer<typeof createTradeSchema>;

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const senderId = authResult.auth.id;

  const parsed = createTradeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse("Data schema not correct", 400);
  }
  const { receiverId, cardIds } = parsed.data;

  if (cardIds.length === 0) {
    return errorResponse("No cards selected", 400);
  }
  if (receiverId === senderId) {
    return errorResponse("Cannot trade with yourself", 400);
  }

  const [receiver, sender, me] = await Promise.all([
    getUser(receiverId),
    getUser(senderId),
    getMe(),
  ]);
  if (!receiver || !sender) {
    return errorResponse("Receiver or sender not found", 404);
  }

  const validation = await validateCardsForTrade(cardIds, senderId);
  if (!validation.ok) {
    return errorResponse(validation.error, validation.status);
  }

  let trade;
  try {
    trade = await createTradeWithCards(
      { senderId, receiverId },
      validation.cardIds
    );
  } catch (e) {
    console.error("trade create failed:", e);
    return errorResponse("Something went wrong", 500);
  }

  try {
    const reply_markup = new InlineKeyboard().webApp(
      "Посмотреть",
      `${process.env.HOST_URL}/trade/accept?tradeId=${trade.id}`
    );
    await getApi().sendMessage(
      trade.receiverId,
      `${getProfileLink(me.username, sender.id, sender.name)} предлагает вам трейд`,
      { parse_mode: "HTML", reply_markup }
    );
  } catch (e) {
    console.error("trade create notification failed:", e);
  }

  return NextResponse.json(trade);
}
