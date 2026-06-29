import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import { getApi, getMe, getProfileLink } from "@/lib/bot";
import { getTrade, getUser, updateTrade } from "@/lib/queries";

const deleteTradeSchema = z.object({
  id: z.number(),
});

export async function DELETE(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const parsed = deleteTradeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return errorResponse("Data schema not correct", 400);
  }
  const { id } = parsed.data;

  const trade = await getTrade(id);
  if (!trade) {
    return errorResponse("Trade not found", 404);
  }
  if (trade.senderId !== userId && trade.receiverId !== userId) {
    return errorResponse("Forbidden", 403);
  }

  try {
    const [updated] = await updateTrade(id, { status: "cancelled" });
    const [receiver, me] = await Promise.all([
      getUser(updated.receiverId),
      getMe(),
    ]);
    await getApi().sendMessage(
      updated.senderId,
      `⚠️ Трейд с ${getProfileLink(me.username, receiver.id, receiver.name)} был отменен`,
      { parse_mode: "HTML" }
    );
    return NextResponse.json(updated);
  } catch (e) {
    console.error("trade cancel failed:", e);
    return errorResponse("Something went wrong", 500);
  }
}
