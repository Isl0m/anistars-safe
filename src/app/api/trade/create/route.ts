import { NextResponse } from "next/server";
import { InlineKeyboard } from "grammy";
import { z } from "zod";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import { MAX_CARDS_PER_TRADE, MAX_OUTSTANDING_TRADES } from "@/lib/constants";
import { getApi, getMe, getProfileLink } from "@/lib/bot";
import {
  countOutstandingTrades,
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
    return errorResponse("Не выбрано ни одной карты", 400);
  }
  if (receiverId === senderId) {
    return errorResponse("Нельзя обменяться с самим собой", 400);
  }

  const [receiver, sender, me] = await Promise.all([
    getUser(receiverId),
    getUser(senderId),
    getMe(),
  ]);
  if (!receiver || !sender) {
    return errorResponse("Отправитель или получатель не найден", 404);
  }

  // The tier cap existed only in the browser, so a crafted request could
  // attach any number of cards.
  const maxCards = sender.isPremium
    ? MAX_CARDS_PER_TRADE.premium
    : MAX_CARDS_PER_TRADE.basic;
  if (cardIds.length > maxCards) {
    return errorResponse(`Максимум ${maxCards} карт в трейде`, 400);
  }

  // Every trade created here fires a Telegram notification at the receiver.
  // Without a cap one account could open unlimited trades against anyone whose
  // id it knows and use this route as a notification cannon.
  const outstanding = await countOutstandingTrades(senderId, receiverId);
  if (outstanding.toReceiver >= MAX_OUTSTANDING_TRADES.perReceiver) {
    return errorResponse(
      `У вас уже ${MAX_OUTSTANDING_TRADES.perReceiver} активных трейда с этим игроком. Дождитесь ответа или отмените один из них.`,
      429
    );
  }
  if (outstanding.total >= MAX_OUTSTANDING_TRADES.total) {
    return errorResponse(
      `Нельзя иметь больше ${MAX_OUTSTANDING_TRADES.total} активных трейдов одновременно.`,
      429
    );
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
