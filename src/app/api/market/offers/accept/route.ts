import {
  errorResponse,
  loadPendingOffer,
  marketJobResponse,
  parseBody,
  requireListingOwner,
  requireAuth,
  revalidateMarketPages,
} from "@/lib/api-utils";
import { offerIdSchema } from "@/lib/market-schemas";
import { addMarketJob } from "@/lib/trade-queue";

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const sellerId = authResult.auth.id;

  const body = await parseBody(request, offerIdSchema);
  if ("error" in body) return body.error;
  const { offerId } = body.data;

  const offerResult = await loadPendingOffer(offerId);
  if ("error" in offerResult) return offerResult.error;
  const { offer } = offerResult;

  const listingResult = await requireListingOwner(offer.listingId, sellerId);
  if ("error" in listingResult) return listingResult.error;

  if (listingResult.listing.status !== "active") {
    return errorResponse("Лот больше не активен", 400);
  }

  const outcome = await addMarketJob({
    type: "market-accept",
    offerId,
    sellerId,
  });

  revalidateMarketPages(offer.listingId);
  return marketJobResponse(
    outcome,
    "Обмен обрабатывается — бот пришлёт результат в Telegram",
    "Не удалось обработать обмен"
  );
}
