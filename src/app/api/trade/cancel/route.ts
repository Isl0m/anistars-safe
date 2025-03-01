import { z } from "zod";

import { getMe, getProfileLink, sendTelegramMessage } from "@/lib/bot";
import { getUser, updateTrade } from "@/lib/queries";

const deleteTradeSchema = z.object({
  id: z.number(),
});

export async function DELETE(request: Request) {
  const res = await request.json();
  const parsedData = deleteTradeSchema.safeParse(res);
  if (!parsedData.success)
    return new Response("Data schema not correct", {
      status: 400,
    });
  const { data } = parsedData;
  try {
    const [trade] = await updateTrade(data.id, { status: "cancelled" });
    const receiver = await getUser(trade.receiverId);
    const me = await getMe();
    await sendTelegramMessage(
      trade.senderId,
      `⚠️ Трейд с ${getProfileLink(me.result.username, receiver.id, receiver.name)} был отменен`
    );
    return new Response(JSON.stringify(trade));
  } catch (e) {
    console.log(e);
    return new Response("Something went wrong", { status: 500 });
  }
}
