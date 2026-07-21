import { NextResponse } from "next/server";

import {
  getMarketListingMeta,
  getMarketOffer,
  getUser,
  updateUserPhotoUrl,
} from "@/lib/queries";
import { authenticateRequest, AuthResult } from "@/lib/telegram-auth";

export function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function requireUser(id: string) {
  const user = await getUser(id);
  if (!user) return { error: errorResponse("user not found", 404) };
  return { user };
}

export async function loadPendingOffer(offerId: number | undefined) {
  if (!offerId) return { error: errorResponse("Missing required fields", 400) };
  const offer = await getMarketOffer(offerId);
  if (!offer) return { error: errorResponse("Offer not found", 404) };
  if (offer.status !== "pending")
    return { error: errorResponse("Offer is not pending", 400) };
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
  await updateUserPhotoUrl(auth.id, auth.photoUrl);
  return { auth };
}
