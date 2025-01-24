import { Bot, InlineKeyboard } from "grammy";
import { z } from "zod";

import { addTradeCards, updateTrade } from "@/lib/queries";

const updateTradeSchema = z.object({
  tradeId: z.number(),
  cardIds: z.string().array(),
  cost: z.number(),
});
export type UpdateTradeType = z.infer<typeof updateTradeSchema>;

export async function POST(request: Request) {
  const res = await request.json();
  const parsedData = updateTradeSchema.safeParse(res);
  if (!parsedData.success)
    return new Response("Data schema not correct", {
      status: 400,
    });
  const { data } = parsedData;
  try {
    const [trade] = await updateTrade(data.tradeId, { cost: data.cost });
    await addTradeCards(trade.id, data.cardIds, false);
    const bot = new Bot(process.env.TG_BOT_TOKEN!);
    await bot.api.sendMessage(
      trade.senderId,
      `${trade.receiverId} предлогает вам трейд`,
      {
        reply_markup: new InlineKeyboard()
          .webApp(
            "Посмотреть",
            `${process.env.HOST_URL}/trade/show?tradeId=${trade.id}`
          )
          .row()
          .text("Подтвердить", `acceptMultiTrade,${trade.id}`),
      }
    );
    return new Response(JSON.stringify(trade));
  } catch (e) {
    console.log(e);
    return new Response("Something went wrong", { status: 500 });
  }
}
