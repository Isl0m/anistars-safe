import {
  loadPendingOffer,
  marketJobResponse,
  requireListingOwner,
  requireMarketAccess,
} from "@/lib/api-utils";
import { addMarketJob } from "@/lib/trade-queue";

export async function POST(request: Request) {
  const authResult = await requireMarketAccess(request);
  if ("error" in authResult) return authResult.error;
  const sellerId = authResult.auth.id;

  const { offerId } = await request.json();

  const offerResult = await loadPendingOffer(offerId);
  if ("error" in offerResult) return offerResult.error;

  const listingResult = await requireListingOwner(
    offerResult.offer.listingId,
    sellerId
  );
  if ("error" in listingResult) return listingResult.error;

  const outcome = await addMarketJob({
    type: "market-reject-offer",
    offerId,
    sellerId,
  });

  return marketJobResponse(
    outcome,
    "Отклонение обрабатывается — бот пришлёт результат в Telegram",
    "Не удалось отклонить предложение"
  );
}
