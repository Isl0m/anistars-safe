import { NextResponse } from "next/server";

import { getRequiredParam } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/telegram-auth";
import {
  addFavouriteCard,
  getUserFavouriteCards,
  getUserFavouriteCardIds,
  removeFavouriteCard,
  reorderFavouriteCards,
} from "@/lib/queries";

export async function GET(request: Request) {
  const param = getRequiredParam(request, "id");
  if ("error" in param) return param.error;

  const cards = await getUserFavouriteCards(param.value);
  return NextResponse.json({ cards });
}

export async function POST(request: Request) {
  const auth = authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { cardId } = body;
  if (!cardId) {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }

  const result = await addFavouriteCard(auth.id, cardId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const cardIds = await getUserFavouriteCardIds(auth.id);
  return NextResponse.json({ success: true, favouriteCardIds: cardIds });
}

export async function DELETE(request: Request) {
  const auth = authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { cardId } = body;
  if (!cardId) {
    return NextResponse.json({ error: "cardId required" }, { status: 400 });
  }

  await removeFavouriteCard(auth.id, cardId);
  const cardIds = await getUserFavouriteCardIds(auth.id);
  return NextResponse.json({ success: true, favouriteCardIds: cardIds });
}

export async function PUT(request: Request) {
  const auth = authenticateRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { cardIds } = body;
  if (!Array.isArray(cardIds)) {
    return NextResponse.json({ error: "cardIds array required" }, { status: 400 });
  }

  try {
    const result = await reorderFavouriteCards(auth.id, cardIds);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("reorder favourites error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown error" },
      { status: 500 }
    );
  }
}
