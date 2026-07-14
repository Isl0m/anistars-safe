import { NextResponse } from "next/server";

import { errorResponse, requireAuth } from "@/lib/api-utils";
import {
  addFavouriteCard,
  getUserFavouriteCardIds,
  getUserFavouriteCards,
  removeFavouriteCard,
  reorderFavouriteCards,
} from "@/lib/queries";

export async function GET(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;
  const userId = authResult.auth.id;

  const { searchParams } = new URL(request.url);
  if (searchParams.get("ids")) {
    const cardIds = await getUserFavouriteCardIds(userId);
    return NextResponse.json({ cardIds });
  }

  const cards = await getUserFavouriteCards(userId);
  return NextResponse.json({ cards });
}

export async function POST(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;

  const { cardId } = await request.json();
  if (!cardId) {
    return errorResponse("cardId required", 400);
  }

  const result = await addFavouriteCard(authResult.auth.id, cardId);
  if (!result.ok) {
    return errorResponse(result.error, 400);
  }

  const cardIds = await getUserFavouriteCardIds(authResult.auth.id);
  return NextResponse.json({ success: true, favouriteCardIds: cardIds });
}

export async function DELETE(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;

  const { cardId } = await request.json();
  if (!cardId) {
    return errorResponse("cardId required", 400);
  }

  await removeFavouriteCard(authResult.auth.id, cardId);
  const cardIds = await getUserFavouriteCardIds(authResult.auth.id);
  return NextResponse.json({ success: true, favouriteCardIds: cardIds });
}

export async function PUT(request: Request) {
  const authResult = await requireAuth(request);
  if ("error" in authResult) return authResult.error;

  const cardIds = await request.json();
  if (!Array.isArray(cardIds)) {
    return errorResponse("cardIds array required", 400);
  }

  try {
    const result = await reorderFavouriteCards(authResult.auth.id, cardIds);
    if (!result.ok) {
      return errorResponse(result.error, 400);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("reorder favourites error:", e);
    return errorResponse(e instanceof Error ? e.message : "unknown error", 500);
  }
}
