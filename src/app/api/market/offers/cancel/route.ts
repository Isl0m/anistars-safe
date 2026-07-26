import {
  errorResponse,
  loadPendingOffer,
  marketJobResponse,
  requireMarketAccess,
} from "@/lib/api-utils";
import { addMarketJob } from "@/lib/trade-queue";

export async function POST(request: Request) {
  const authResult = await requireMarketAccess(request);
  if ("error" in authResult) return authResult.error;
  const buyerId = authResult.auth.id;

  const { offerId } = await request.json();

  const offerResult = await loadPendingOffer(offerId);
  if ("error" in offerResult) return offerResult.error;

  if (offerResult.offer.buyerId !== buyerId) {
    return errorResponse("Нет доступа к этому предложению", 403);
  }

  const outcome = await addMarketJob({
    type: "market-cancel-offer",
    offerId,
    buyerId,
  });

  return marketJobResponse(
    outcome,
    "Отмена обрабатывается — бот пришлёт результат в Telegram",
    "Не удалось отменить предложение"
  );
}
