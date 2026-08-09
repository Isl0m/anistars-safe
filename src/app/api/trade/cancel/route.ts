import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, parseBody, requireAuth } from "@/lib/api-utils";
import { getApi, getMe, getProfileLink } from "@/lib/bot";
import { getTrade, getUser, updateTrade } from "@/lib/queries";

const deleteTradeSchema = z.object({
  id: z.number().int().positive(),
});

export async function DELETE(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const body = await parseBody(request, deleteTradeSchema);
  if ("error" in body) return body.error;
  const { id } = body.data;

  const trade = await getTrade(id);
  if (!trade) {
    return errorResponse("Трейд не найден", 404);
  }
  if (trade.senderId !== userId && trade.receiverId !== userId) {
    return errorResponse("Нет доступа к этому трейду", 403);
  }
  // Without this a finished trade could be flipped to `cancelled` after the
  // fact, which drops it out of /trade/history (that query filters on
  // `completed`) and off the profile trade counter.
  if (trade.status !== "pending" && trade.status !== "fulfilled") {
    return errorResponse(
      trade.status === "completed"
        ? "Этот трейд уже завершён"
        : "Этот трейд уже отменён",
      400
    );
  }

  let updated;
  try {
    [updated] = await updateTrade(id, { status: "cancelled" });
  } catch (e) {
    console.error("trade cancel failed:", e);
    return errorResponse("Что-то пошло не так", 500);
  }

  // Outside the error boundary above: the cancellation is already committed,
  // so failing to notify must not report the action as failed. The message
  // goes to the counterparty and names whoever cancelled — it used to always
  // go to the sender and always name the receiver.
  try {
    const counterpartyId =
      updated.senderId === userId ? updated.receiverId : updated.senderId;
    const [actor, me] = await Promise.all([getUser(userId), getMe()]);
    if (actor) {
      await getApi().sendMessage(
        counterpartyId,
        `⚠️ Трейд с ${getProfileLink(me.username, actor.id, actor.name)} был отменен`,
        { parse_mode: "HTML" }
      );
    }
  } catch (e) {
    console.error("trade cancel notification failed:", e);
  }

  return NextResponse.json(updated);
}
