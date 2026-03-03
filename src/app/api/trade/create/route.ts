import { NextResponse } from "next/server";
import { z } from "zod";

import { getMe, getProfileLink, sendTelegramMessage } from "@/lib/bot";
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
    return NextResponse.json(
      { error: "Data schema not correct" },
      {
        status: 400,
      }
    );
  const { data } = parsedData;
  const receiver = await getUser(data.receiverId);
  const sender = await getUser(data.senderId);
  if (!receiver || !sender)
    return NextResponse.json(
      { error: "Receiver or sender not found" },
      {
        status: 404,
      }
    );
  try {
    const [trade] = await createTrade(data);
    await addTradeCards(trade.id, data.cardIds, true);
    const me = await getMe();
    await sendTelegramMessage(
      trade.receiverId,
      `${getProfileLink(me.result.username, sender.id, sender.name)} предлогает вам трейд`,
      [
        [
          {
            text: "Посмотреть",
            web_app: {
              url: `${process.env.HOST_URL}/trade/accept?tradeId=${trade.id}`,
            },
          },
        ],
      ]
    );
    return NextResponse.json(trade);
  } catch (e) {
    console.log("error", e);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
