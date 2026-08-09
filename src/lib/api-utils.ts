import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z, ZodType } from "zod";

import {
  getMarketListingMeta,
  getMarketOffer,
  getUser,
  updateUserPhotoUrl,
} from "@/lib/queries";
import { authenticateRequest, AuthResult } from "@/lib/telegram-auth";
import { MarketJobOutcome } from "@/lib/trade-queue";

export function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function revalidateMarketPages(listingId?: number) {
  revalidatePath("/market");
  if (listingId !== undefined) revalidatePath(`/market/${listingId}`);
}

/**
 * Reads and validates a JSON body.
 *
 * `await request.json()` throws on malformed input, which surfaces as a 500;
 * the market routes also used to destructure the raw object and rely on
 * truthiness checks, so untyped values reached the query layer.
 */
export async function parseBody<T extends ZodType>(
  request: Request,
  schema: T
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: errorResponse("Некорректный запрос", 400) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: errorResponse("Некорректные данные запроса", 400) };
  }
  return { data: parsed.data };
}

/**
 * Turns a worker outcome into a response the UI can render.
 *
 * The worker reports business refusals ("Лот уже недоступен") by *returning*
 * `ok: false`, not by throwing, so forwarding the raw object with a 200 makes
 * every refusal look like a success to the client.
 *
 * - 200 `{ ok: true, message }`  — done, show the worker's message
 * - 409 `{ error }`             — refused, `error` is the worker's message
 * - 202 `{ pending: true }`     — still queued; the bot will notify over Telegram
 * - 500 `{ error }`             — queue unreachable or the job threw
 */
export function marketJobResponse(
  outcome: MarketJobOutcome,
  pendingMessage: string,
  failedMessage: string
) {
  if (outcome.status === "failed") {
    console.error("market job failed:", outcome.error);
    return errorResponse(failedMessage, 500);
  }

  if (outcome.status === "pending") {
    return NextResponse.json(
      { ok: false, pending: true, message: pendingMessage },
      { status: 202 }
    );
  }

  const { ok, message } = outcome.result;
  if (!ok) return errorResponse(message, 409);
  return NextResponse.json({ ok: true, message });
}

export async function requireUser(id: string) {
  const user = await getUser(id);
  if (!user) return { error: errorResponse("user not found", 404) };
  return { user };
}

export async function loadPendingOffer(offerId: number | undefined) {
  if (!offerId)
    return { error: errorResponse("Некорректный запрос", 400) };
  const offer = await getMarketOffer(offerId);
  if (!offer)
    return { error: errorResponse("Предложение не найдено", 404) };
  if (offer.status !== "pending")
    return { error: errorResponse("Это предложение уже недоступно", 400) };
  return { offer };
}

export async function requireListingOwner(listingId: number, sellerId: string) {
  const listing = await getMarketListingMeta(listingId);
  if (!listing || listing.sellerId !== sellerId) {
    return { error: errorResponse("Forbidden", 403) };
  }
  return { listing };
}

export async function requireAdmin(request: Request) {
  const authed = await requireAuth(request);
  if ("error" in authed) return authed;
  const result = await requireUser(authed.auth.id);
  if ("error" in result) return result;
  if (result.user.type !== "admin") {
    return { error: errorResponse("Forbidden", 403) };
  }
  return result;
}

export function getRequiredParam(request: Request, param: string) {
  const { searchParams } = new URL(request.url);
  const value = searchParams.get(param);
  if (!value) {
    return { error: errorResponse(`${param} param required`, 400) };
  }
  return { value };
}

export async function requireAuth(
  request: Request
): Promise<{ auth: AuthResult } | { error: NextResponse }> {
  const auth = authenticateRequest(request);
  if (!auth) {
    return { error: errorResponse("Unauthorized", 401) };
  }
  void Promise.resolve(updateUserPhotoUrl(auth.id, auth.photoUrl)).catch((e) =>
    console.error("photo url update failed:", e)
  );
  return { auth };
}

