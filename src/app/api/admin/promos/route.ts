import { NextResponse } from "next/server";

import { logAdminAction, requireOwner } from "@/lib/admin/api";
import { promoInputSchema } from "@/lib/admin/promo-schema";
import {
  createPromo,
  listPromos,
  promoColumns,
  promoSlugTaken,
} from "@/lib/admin/queries";
import { errorResponse, parseBody } from "@/lib/api-utils";

export async function GET(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;
  return NextResponse.json({ promos: await listPromos() });
}

export async function POST(request: Request) {
  const owner = await requireOwner(request);
  if ("error" in owner) return owner.error;

  const parsed = await parseBody(request, promoInputSchema);
  if ("error" in parsed) return parsed.error;
  const input = parsed.data;

  if (await promoSlugTaken(input.slug)) {
    return errorResponse("Такой промокод уже есть", 409);
  }
  const resolved = await promoColumns(input);
  if ("error" in resolved) return errorResponse(resolved.error, 400);

  const id = await createPromo(input, resolved.columns);
  if (!id) return errorResponse("Такой промокод уже есть", 409);

  await logAdminAction(owner.ownerId, "promo-create", null, { id, ...input });
  return NextResponse.json({ ok: true, id });
}
