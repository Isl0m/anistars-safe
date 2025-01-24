import { Bot, InlineKeyboard } from "grammy";
import { z } from "zod";

import { addTradeCards, createTrade, getUser } from "@/lib/queries";

const createTradeSchema = z.object({
  senderId: z.string(),
  receiverId: z.string(),
  cardIds: z.string().array(),
});
export type CreateTradeType = z.infer<typeof createTradeSchema>;

export async function POST(request: Request) {
  const res = await request.json();
  const parsedData = createTradeSchema.safeParse(res);
  if (!parsedData.success)
    return new Response("Data schema not correct", {
      status: 400,
    });
  const { data } = parsedData;
  const receiver = await getUser(data.receiverId);
  if (!receiver) return new Response("Receiver not found", { status: 404 });
  try {
    const [trade] = await createTrade(data);
    await addTradeCards(trade.id, data.cardIds, true);
    const bot = new Bot(process.env.TG_BOT_TOKEN!);
    const msg = await bot.api.sendMessage(
      trade.receiverId,
      `${trade.senderId} предлогает вам трейд`,
      {
        reply_markup: new InlineKeyboard().webApp(
          "Посмотреть",
          `${process.env.HOST_URL}/trade/accept?tradeId=${trade.id}`
        ),
      }
    );
    return new Response(JSON.stringify(trade));
  } catch (e) {
    console.log("error", e);
    return new Response("Something went wrong", { status: 500 });
  }
}
