import {
  errorResponse,
  marketJobResponse,
  requireMarketAccess,
} from "@/lib/api-utils";
import { getMarketListingMeta } from "@/lib/queries";
import { addMarketJob } from "@/lib/trade-queue";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const authResult = await requireMarketAccess(request);
  if ("error" in authResult) return authResult.error;
  const sellerId = authResult.auth.id;

  const listingId = parseInt(params.id);
  if (Number.isNaN(listingId)) {
    return errorResponse("Некорректный лот", 400);
  }

  const listing = await getMarketListingMeta(listingId);

  if (!listing) {
    return errorResponse("Лот не найден", 404);
  }

  if (listing.sellerId !== sellerId) {
    return errorResponse("Нет доступа к этому лоту", 403);
  }

  if (listing.status !== "active") {
    return errorResponse("Лот больше не активен", 400);
  }

  const outcome = await addMarketJob({
    type: "market-cancel-listing",
    listingId,
    sellerId,
  });

  return marketJobResponse(
    outcome,
    "Снятие лота обрабатывается — бот пришлёт результат в Telegram",
    "Не удалось снять лот"
  );
}
