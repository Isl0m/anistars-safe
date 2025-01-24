import { z } from "zod";

import { removeTrade } from "@/lib/queries";

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
    const [trade] = await removeTrade(data.id);
    return new Response(JSON.stringify(trade));
  } catch (e) {
    console.log(e);
    return new Response("Something went wrong", { status: 500 });
  }
}
