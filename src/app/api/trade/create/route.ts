import { NextResponse } from "next/server";
import { InlineKeyboard } from "grammy";
import { z } from "zod";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import {
  MAX_CARDS_PER_TRADE,
  MAX_TRADES_PER_WINDOW,
  TRADE_RATE_WINDOW_MINUTES,
} from "@/lib/constants";
import { getApi, getMe, getProfileLink } from "@/lib/bot";
import {
  countRecentTrades,
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

  // Every trade created here fires a Telegram notification at the receiver, so
  // this route is a notification cannon without a limit. Limited by rate rather
  // than by standing total: two people who trade constantly accumulate open
  // trades legitimately, and nothing expires a `pending` one.
  const recent = await countRecentTrades(
    senderId,
    receiverId,
    TRADE_RATE_WINDOW_MINUTES
  );
  if (recent.toReceiver >= MAX_TRADES_PER_WINDOW.perReceiver) {
    return errorResponse(
      `Слишком много трейдов этому игроку. Подождите ${TRADE_RATE_WINDOW_MINUTES} минут и попробуйте снова.`,
      429
    );
  }
  if (recent.total >= MAX_TRADES_PER_WINDOW.total) {
    return errorResponse(
      `Слишком много трейдов за короткое время. Подождите ${TRADE_RATE_WINDOW_MINUTES} минут и попробуйте снова.`,
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
